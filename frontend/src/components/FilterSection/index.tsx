import React from 'react'
import styles from './styles.module.css'

export interface FilterSectionProps {
    allIngredients: string[]
    selectedIngredients: string[]
    onIngredientToggle: (ingredient: string) => void
    titleFilter: string
    onTitleChange: (newTitle: string) => void
}

const FilterSection: React.FC<FilterSectionProps> = ({
                                                         allIngredients,
                                                         selectedIngredients,
                                                         onIngredientToggle,
                                                         titleFilter,
                                                         onTitleChange,
                                                     }) => {
    const [expanded, setExpanded] = React.useState(false)

    const deduplicateAndSorted = (ingredients: string[]) => {
        const ingredientCounter: { [key: string]: number } = {}
        ingredients
            .sort((a, b) => a.localeCompare(b))
            .map(i => i.split(',')[0]) // only use the main ingredient
            .forEach(i => {
                if (ingredientCounter[i]) {
                    ingredientCounter[i]++;
                } else {
                    ingredientCounter[i] = 1;
                }
            });

        const sortedByCount = Object.entries(ingredientCounter)
            .sort(([, countA], [, countB]) => countB - countA);

        return sortedByCount.map(([name]) => name);
    }

    return (
        <div className={styles.filterSection}>
            <button
                type="button"
                className={styles.expandToggle}
                onClick={() => setExpanded(e => !e)}
            >
                {expanded ? 'Filter ausblenden ▲' : 'Filter anzeigen ▼'}
            </button>

            {expanded && (
                <>
                    {/* Title Search */}
                    <div className={styles.titleFilter}>
                        <input
                            type="text"
                            placeholder="Suche nach Titel..."
                            value={titleFilter}
                            onChange={e => onTitleChange(e.target.value)}
                            className={styles.titleInput}
                        />
                    </div>

                    {/* Ingredients Filter */}
                    <div className={styles.ingFilter}>
                        <span className={styles.ingLabel}>Zutaten:</span>
                        <div className={styles.ingList}>
                            {deduplicateAndSorted(allIngredients).map(ing => {
                                const selected = selectedIngredients.includes(ing)
                                return (
                                    <button
                                        key={ing}
                                        type="button"
                                        className={`${styles.ingButton} ${selected ? styles.selected : ''}`}
                                        onClick={() => onIngredientToggle(ing)}
                                    >
                                        {ing}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default FilterSection
