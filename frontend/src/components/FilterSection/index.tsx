import React from 'react'
import styles from './styles.module.css'

export interface FilterSectionProps {
    selectedTypes: string[]
    onTypeToggle: (type: string) => void
    typeMode: 'or' | 'and'
    onTypeModeChange: (mode: 'or' | 'and') => void
    selectedDietary: string[]
    onDietaryToggle: (dietary: string) => void
    dietaryMode: 'or' | 'and'
    onDietaryModeChange: (mode: 'or' | 'and') => void
}

const RECIPE_TYPES = [
    { value: 'cooking', label: 'Kochen' },
    { value: 'baking', label: 'Backen' },
    { value: 'snack', label: 'Snack' },
    { value: 'dessert', label: 'Dessert' },
    { value: 'other', label: 'Sonstiges' },
]

const DIETARY_OPTIONS = [
    { value: 'vegan', label: 'Vegan' },
    { value: 'vegetarian', label: 'Vegetarisch' },
    { value: 'glutenfree', label: 'Glutenfrei' },
    { value: 'dairyfree', label: 'Laktosefrei' },
    { value: 'other', label: 'Sonstiges' },
]

const ModeToggle: React.FC<{
    mode: 'or' | 'and'
    onChange: (mode: 'or' | 'and') => void
}> = ({ mode, onChange }) => (
    <span className={ styles.modeToggle }>
        <button
            type="button"
            className={ `${ styles.modeBtn } ${ mode === 'or' ? styles.modeBtnActive : '' }` }
            onClick={ () => onChange('or') }
        >ODER</button>
        <button
            type="button"
            className={ `${ styles.modeBtn } ${ mode === 'and' ? styles.modeBtnActive : '' }` }
            onClick={ () => onChange('and') }
        >UND</button>
    </span>
)

const FilterSection: React.FC<FilterSectionProps> = ({
                                                         selectedTypes,
                                                         onTypeToggle,
                                                         typeMode,
                                                         onTypeModeChange,
                                                         selectedDietary,
                                                         onDietaryToggle,
                                                         dietaryMode,
                                                         onDietaryModeChange,
                                                     }) => {
    const [expanded, setExpanded] = React.useState(false)
    const [ popupTop, setPopupTop ] = React.useState(0)
    const wrapperRef = React.useRef<HTMLDivElement>(null)
    const buttonRef = React.useRef<HTMLButtonElement>(null)

    const activeCount = selectedTypes.length + selectedDietary.length

    React.useEffect(() => {
        if (!expanded) return
        const handleClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setExpanded(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [ expanded ])

    const handleToggle = () => {
        if (!expanded && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setPopupTop(rect.bottom + 8)
        }
        setExpanded(e => !e)
    }

    return (
        <div className={ styles.filterWrapper } ref={ wrapperRef }>
            <button
                ref={ buttonRef }
                type="button"
                className={ `${ styles.filterToggleChip } ${ activeCount > 0 ? styles.filterToggleActive : '' }` }
                onClick={ handleToggle }
            >
                <i className="fa-solid fa-sliders" />
                <span className={ styles.filterLabel }> Mehr Filter</span>
                { activeCount > 0 && <span className={ styles.filterBadge }>{ activeCount }</span> }
            </button>

            {expanded && (
                <div className={ styles.filterPopup } style={ { ['--popup-top' as string]: `${ popupTop }px` } }>
                    <div className={ styles.filterGroup }>
                        <div className={ styles.filterGroupHeader }>
                            <span className={ styles.ingLabel }>Rezepttyp</span>
                            <ModeToggle mode={ typeMode } onChange={ onTypeModeChange } />
                        </div>
                        <div className={styles.ingList}>
                            { RECIPE_TYPES.map(({ value, label }) => (
                                <button
                                    key={ value }
                                    type="button"
                                    className={ `${ styles.ingButton } ${ selectedTypes.includes(value) ? styles.selected : '' }` }
                                    onClick={ () => onTypeToggle(value) }
                                >
                                    { label }
                                </button>
                            )) }
                        </div>
                    </div>

                    <div className={ styles.filterGroup }>
                        <div className={ styles.filterGroupHeader }>
                            <span className={ styles.ingLabel }>Ernährung</span>
                            <ModeToggle mode={ dietaryMode } onChange={ onDietaryModeChange } />
                        </div>
                        <div className={ styles.ingList }>
                            { DIETARY_OPTIONS.map(({ value, label }) => (
                                <button
                                    key={ value }
                                    type="button"
                                    className={ `${ styles.ingButton } ${ selectedDietary.includes(value) ? styles.selected : '' }` }
                                    onClick={ () => onDietaryToggle(value) }
                                >
                                    { label }
                                </button>
                            )) }
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default FilterSection
