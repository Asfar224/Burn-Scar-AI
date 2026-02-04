import { db } from '../firebase-config';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Initialize or get user document - creates document if it doesn't exist
 */
export const initializeUserDocument = async (userId, userData = {}) => {
    try {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            // Create user document with empty history array
            await setDoc(userDocRef, {
                userId,
                email: userData.email || '',
                displayName: userData.displayName || '',
                history: [],
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp()
            });
            console.log('✅ User document created for:', userId);
        } else {
            console.log('✅ User document already exists for:', userId);
        }

        return true;
    } catch (error) {
        console.error('❌ Error initializing user document:', error);
        throw error;
    }
};

/**
 * Save analysis result to Firestore - stores in user document's history array
 * STRONG LOGIC: Read current history, append new item, write back
 */
// Helper function to convert image file to base64
const imageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Compress image if it's too large (Firestore has 1MB limit per field)
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Resize if image is too large (max 800px on longest side)
                const maxDimension = 800;
                if (width > height && width > maxDimension) {
                    height = (height / width) * maxDimension;
                    width = maxDimension;
                } else if (height > maxDimension) {
                    width = (width / height) * maxDimension;
                    height = maxDimension;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to base64 with quality compression
                const base64 = canvas.toDataURL('image/jpeg', 0.7);
                resolve(base64);
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export const saveAnalysis = async (userId, imageFile, analysisResult) => {
    try {
        console.log('🔄 Starting saveAnalysis for user:', userId);
        
        // METHOD: Store image as base64 in Firestore (no billing, no external services needed)
        // This works immediately with Firebase free tier
        let imageUrl = '';
        let imageBase64 = '';
        const timestamp = Date.now();
        
        // Convert image to base64 (compressed for Firestore size limits)
        console.log('📤 Converting image to base64 (no billing required)');
        try {
            imageBase64 = await imageToBase64(imageFile);
            // Use base64 as imageUrl for display (data URL)
            imageUrl = imageBase64;
            console.log('✅ Image converted to base64, size:', Math.round(imageBase64.length / 1024), 'KB');
        } catch (convertError) {
            console.error('❌ Failed to convert image to base64:', convertError);
            console.warn('⚠️ Image will be saved without data - analysis data will still be saved');
        }

        // Step 2: Create history item with all required fields
        // Note: Cannot use serverTimestamp() inside arrays - use regular Date instead
        const createdAt = new Date().toISOString();
        const historyItem = {
            id: `${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
            imageUrl: imageUrl, // Base64 data URL (no external storage needed, no billing)
            imageBase64: imageBase64, // Store base64 separately for easy access
            imageName: imageFile.name,
            burnDegree: analysisResult.burn_degree || 'Unknown',
            burnDegreeIndex: analysisResult.burn_degree_index !== undefined ? analysisResult.burn_degree_index : -1,
            confidence: analysisResult.confidence || 0,
            confidenceBreakdown: analysisResult.confidence_breakdown || {},
            healingStage: analysisResult.healing_stage || 'N/A',
            progressionSummary: analysisResult.progression_summary || '',
            recommendations: analysisResult.recommendations || [],
            burnInfo: analysisResult.burn_info || null,
            createdAt: createdAt,
            timestamp: createdAt // Use ISO string instead of serverTimestamp() for array items
        };

        console.log('📝 History item created:', {
            id: historyItem.id,
            burnDegree: historyItem.burnDegree,
            confidence: historyItem.confidence
        });

        // Step 3: Ensure user document exists
        await initializeUserDocument(userId);

        // Step 4: Get current user document
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            // Create document with first history item
            console.log('📄 Creating new user document with first analysis');
            await setDoc(userDocRef, {
                userId,
                history: [historyItem],
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp()
            });
            console.log('✅ User document created with first analysis');
        } else {
            // Read current history, append new item, write back
            console.log('📖 Reading current user document...');
            const userData = userDocSnap.data();
            const currentHistory = userData.history || [];
            
            console.log('📊 Current history count:', currentHistory.length);
            
            // Check if this analysis already exists (by ID)
            const existingIndex = currentHistory.findIndex(item => item.id === historyItem.id);
            
            if (existingIndex === -1) {
                // Add new item to history
                const updatedHistory = [historyItem, ...currentHistory]; // Newest first
                console.log('➕ Adding new analysis to history, new count:', updatedHistory.length);
                
                // Update document with new history
                await updateDoc(userDocRef, {
                    history: updatedHistory,
                    lastUpdated: serverTimestamp()
                });
                console.log('✅ Analysis saved successfully! New history count:', updatedHistory.length);
            } else {
                console.log('⚠️ Analysis already exists in history, skipping duplicate');
            }
        }

        // Step 5: Verify the save by reading back
        const verifyDoc = await getDoc(userDocRef);
        if (verifyDoc.exists()) {
            const verifyData = verifyDoc.data();
            const verifyHistory = verifyData.history || [];
            console.log('✅ Verification: History count after save:', verifyHistory.length);
            console.log('✅ Latest analysis ID:', verifyHistory[0]?.id);
        }

        return {
            id: historyItem.id,
            ...historyItem
        };
    } catch (error) {
        console.error('❌ Error saving analysis:', error);
        console.error('❌ Error details:', {
            userId,
            errorCode: error.code,
            errorMessage: error.message,
            errorStack: error.stack
        });
        throw error;
    }
};

/**
 * Get all analyses for a user from their document's history array
 */
export const getUserAnalyses = async (userId) => {
    try {
        console.log('📖 Fetching analyses for user:', userId);
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            console.log('⚠️ User document does not exist');
            return [];
        }

        const userData = userDocSnap.data();
        const history = userData.history || [];

        console.log('📊 Raw history from Firestore:', history.length, 'items');

        // Normalize and sort history items (newest first)
        const analyses = history.map((item, index) => {
            // Handle both Firestore timestamp and ISO string
            let createdAt = item.createdAt;
            if (item.timestamp && item.timestamp.toDate) {
                createdAt = item.timestamp.toDate().toISOString();
            } else if (!createdAt && item.timestamp) {
                createdAt = new Date(item.timestamp).toISOString();
            } else if (!createdAt) {
                createdAt = new Date().toISOString();
            }

            return {
                id: item.id || `analysis_${index}_${Date.now()}`,
                userId: userId,
                imageUrl: item.imageUrl || item.imageBase64 || '', // Use imageBase64 as fallback
                imageBase64: item.imageBase64 || item.imageUrl || '', // Include both for compatibility
                imageName: item.imageName || '',
                burnDegree: item.burnDegree || 'Unknown',
                burnDegreeIndex: item.burnDegreeIndex !== undefined ? item.burnDegreeIndex : -1,
                confidence: item.confidence || 0,
                confidenceBreakdown: item.confidenceBreakdown || {},
                healingStage: item.healingStage || 'N/A',
                progressionSummary: item.progressionSummary || '',
                recommendations: item.recommendations || [],
                burnInfo: item.burnInfo || null,
                timestamp: item.timestamp,
                createdAt: createdAt
            };
        });

        // Sort by createdAt (newest first)
        analyses.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA; // Descending order (newest first)
        });

        console.log('✅ Returning', analyses.length, 'analyses');
        return analyses;
    } catch (error) {
        console.error('❌ Error fetching analyses:', error);
        console.error('❌ Error details:', {
            userId,
            errorCode: error.code,
            errorMessage: error.message
        });
        // Return empty array instead of throwing to prevent UI crashes
        return [];
    }
};

/**
 * Get a single analysis by ID from user's history
 */
export const getAnalysisById = async (userId, analysisId) => {
    try {
        const analyses = await getUserAnalyses(userId);
        const analysis = analyses.find(a => a.id === analysisId);
        
        if (analysis) {
            return analysis;
        } else {
            throw new Error('Analysis not found');
        }
    } catch (error) {
        console.error('Error fetching analysis:', error);
        throw error;
    }
};

/**
 * Get analysis statistics for a user
 */
export const getUserStats = async (userId) => {
    try {
        console.log('📊 Calculating stats for user:', userId);
        const analyses = await getUserAnalyses(userId);
        console.log('📊 Analyses count for stats:', analyses.length);

        const stats = {
            totalAnalyses: analyses.length,
            firstDegree: 0,
            secondDegree: 0,
            thirdDegree: 0,
            averageConfidence: 0,
            latestAnalysis: analyses[0] || null
        };

        let totalConfidence = 0;
        let validConfidenceCount = 0;

        analyses.forEach((analysis, index) => {
            // Handle confidence - ensure it's a number
            const confidence = typeof analysis.confidence === 'number' ? analysis.confidence : parseFloat(analysis.confidence) || 0;
            if (confidence > 0) {
                totalConfidence += confidence;
                validConfidenceCount++;
            }

            // Handle burnDegreeIndex - ensure it's a number
            const burnDegreeIndex = typeof analysis.burnDegreeIndex === 'number' 
                ? analysis.burnDegreeIndex 
                : parseInt(analysis.burnDegreeIndex);
            
            switch (burnDegreeIndex) {
                case 0:
                    stats.firstDegree++;
                    break;
                case 1:
                    stats.secondDegree++;
                    break;
                case 2:
                    stats.thirdDegree++;
                    break;
                default:
                    break;
            }
        });

        if (validConfidenceCount > 0) {
            stats.averageConfidence = parseFloat((totalConfidence / validConfidenceCount).toFixed(2));
        }

        console.log('✅ Stats calculated:', stats);
        return stats;
    } catch (error) {
        console.error('❌ Error calculating stats:', error);
        // Return default stats instead of throwing
        return {
            totalAnalyses: 0,
            firstDegree: 0,
            secondDegree: 0,
            thirdDegree: 0,
            averageConfidence: 0,
            latestAnalysis: null
        };
    }
};
