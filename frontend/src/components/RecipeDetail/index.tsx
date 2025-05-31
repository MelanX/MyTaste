import React, { useRef } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import styles from './styles.module.css';
import BringButton from "../BringButton";
import RecipeSidebar from './RecipeSidebar';
import RecipeInstructions from './Instructions';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from "../../context/AuthContext";
import { useRecipe } from "../../hooks/useRecipe";
import { upsertRecipe } from "../../utils/recipesCache";

const RecipeDetail: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const { id } = useParams<{ id: string }>();
    const { recipe, loading, error } = useRecipe(id);

    const buttonsRowRef = useRef<HTMLDivElement>(null);
    const location = useLocation();
    const currentUrl = window.location.origin + location.pathname;

    if (loading) return <div>Lade Rezept...</div>;
    if (error) return <div>Fehler: { error.message }</div>;
    if (!recipe) return <div>Rezept nicht gefunden</div>;

    return (
        <div className={ styles.recipeDetail }>
            <div className={ styles.titleContainer }>
                <h1>{ recipe.title }
                    { isAuthenticated && (
                        <Link to={ `/edit/${ recipe.id }` } className={ `${ styles.editRecipeButton } no-print` }>
                            <i className="fa-solid fa-pen" />
                        </Link>
                    ) }
                </h1>
                <div className={ styles.qrCode }>
                    Im Browser aufrufen:
                    <QRCodeSVG value={ currentUrl } size={ 50 } fgColor={ '#d99c5e' } />
                </div>
            </div>
            <div className={ styles.contentWrapper }>
                <div className={ styles.mainContent }>
                    <RecipeInstructions instructions={ recipe.instructions } />
                    <div className={ `${ styles.buttonsRow } no-print` } ref={ buttonsRowRef }>
                        { recipe.url && (
                            <a href={ recipe.url } className={ styles.originalRecipeButton } target="_blank"
                               rel="noopener noreferrer">Zum Originalrezept</a>
                        ) }
                        <div className={ styles.bringButton }>
                            <BringButton recipeId={ recipe.id } />
                        </div>
                    </div>
                </div>
                <RecipeSidebar recipe={ recipe } updateRecipe={ r => upsertRecipe(r) } />
            </div>
        </div>
    );
};

export default RecipeDetail;
