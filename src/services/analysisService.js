import { db, storage } from '../firebase-config';
import { collection, addDoc, query, where, orderBy, getDocs, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Save analysis result to Firestore
 */
export const saveAnalysis = async (userId, imageFile, analysisResult) => {
    try {
        // Upload image to Storage
        const timestamp = Date.now();
        const imageRef = ref(storage, `analysis-images/${userId}/${timestamp}_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        const imageUrl = await getDownloadURL(imageRef);

        // Save analysis to Firestore
        const analysisData = {
            userId,
            imageUrl,
            imageName: imageFile.name,
            burnDegree: analysisResult.burn_degree,
            burnDegreeIndex: analysisResult.burn_degree_index,
            confidence: analysisResult.confidence,
            confidenceBreakdown: analysisResult.confidence_breakdown,
            healingStage: analysisResult.healing_stage,
            progressionSummary: analysisResult.progression_summary,
            recommendations: analysisResult.recommendations,
            burnInfo: analysisResult.burn_info,
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'analyses'), analysisData);

        return {
            id: docRef.id,
            ...analysisData
        };
    } catch (error) {
        console.error('Error saving analysis:', error);
        throw error;
    }
};

/**
 * Get all analyses for a user
 */
export const getUserAnalyses = async (userId) => {
    try {
        const analysesRef = collection(db, 'analyses');
        const q = query(
            analysesRef,
            where('userId', '==', userId),
            orderBy('timestamp', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const analyses = [];

        querySnapshot.forEach((doc) => {
            analyses.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return analyses;
    } catch (error) {
        console.error('Error fetching analyses:', error);
        throw error;
    }
};

/**
 * Get a single analysis by ID
 */
export const getAnalysisById = async (analysisId) => {
    try {
        const docRef = doc(db, 'analyses', analysisId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            };
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
        const analyses = await getUserAnalyses(userId);

        const stats = {
            totalAnalyses: analyses.length,
            firstDegree: 0,
            secondDegree: 0,
            thirdDegree: 0,
            averageConfidence: 0,
            latestAnalysis: analyses[0] || null
        };

        let totalConfidence = 0;

        analyses.forEach(analysis => {
            totalConfidence += analysis.confidence;

            switch (analysis.burnDegreeIndex) {
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

        if (analyses.length > 0) {
            stats.averageConfidence = (totalConfidence / analyses.length).toFixed(2);
        }

        return stats;
    } catch (error) {
        console.error('Error calculating stats:', error);
        throw error;
    }
};
