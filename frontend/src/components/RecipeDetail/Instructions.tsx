import React from 'react';
import styles from './styles.module.css';

interface RecipeInstructionsProps {
    instructions: string[];
}

const RecipeInstructions: React.FC<RecipeInstructionsProps> = ({instructions}) => {
    return (
        <div className={styles.instructionsCard}>
            <h3 className={styles.instructionsTitle}>Zubereitung</h3>
            <div className={styles.instructionsList}>
                {instructions.map((paragraph, index) => (
                    <div key={index} className={styles.instructionStep}>
                        <div className={styles.stepNumber}>{index + 1}</div>
                        <div className={styles.stepText}>{paragraph}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecipeInstructions;
