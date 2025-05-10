import React from 'react';
import styles from './styles.module.css';

interface BringButtonProps {
    recipeId: string;
}

const BringButton: React.FC<BringButtonProps> = ({ recipeId }) => {
    // For testing, using the gist URL
    const recipeDataUrl = 'https://gist.githubusercontent.com/MelanX/b65ab0e21dab205ea2f67c4e30c4153b/raw/6878415002308aae665bab2893e4738e45985519/test.json';

    // todo In production, use this:
    // const recipeDataUrl = `${process.env.REACT_APP_API_URL}/api/bring-recipe/${recipeId}`;

    // Generate the link manually
    const bringLink = generateBringImportLink(recipeDataUrl);

    const handleClick = () => {
        window.open(bringLink, '_blank');
    };

    return (
        <button
            onClick={handleClick}
            className={styles.bringButton}
        >
            <img src={bringLogo} alt="Bring Logo"
                 className={styles.bringLogo}
            />
            Zur Einkaufsliste
        </button>
    );
};

export default BringButton;

/**
 * Generates a Bring import URL for a recipe
 * @param recipeDataUrl URL to the JSON data for the recipe
 * @returns A URL that can be used to open the Bring app with the recipe data
 */
const generateBringImportLink = (recipeDataUrl: string): string => {
    // URL encode and base64 encode the recipe data URL
    const encodedUrl = btoa(recipeDataUrl)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    // Create the deeplink portion
    const deeplink = `https://deeplink.getbring.com/import?src=${encodedUrl}`;
    const encodedDeeplink = encodeURIComponent(deeplink);

    // Domain used for attribution and tracking
    const domain = window.location.hostname || 'localhost';

    // Create the Firebase dynamic link with all parameters
    const dynamicLink = `https://kqa9s.app.goo.gl/?apn=ch.publisheria.bring&isi=580669177&ibi=ch.publisheria.bring`
        + `&link=${encodedDeeplink}`;

    // Add fallback app store link for Android
    const playStoreRef = encodeURIComponent(`utm_source=${domain}&utm_medium=webimport&utm_campaign=webImportRecipe`);
    const appStoreLink = encodeURIComponent(`https://play.google.com/store/apps/details?id=ch.publisheria.bring&referrer=${playStoreRef}`);

    return `${dynamicLink}&afl=${appStoreLink}`;
};

const bringLogo = 'data:image/png;base64,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';
