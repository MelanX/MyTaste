import React, { useRef } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import BringButton from '../BringButton';
import RecipeSidebar from './RecipeSidebar';
import RecipeInstructions from './Instructions';
import Toast from '../Toast';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import { isAuthError } from '../../utils/apiService';
import { useRecipe } from '../../hooks/useRecipe';
import { upsertRecipe } from '../../utils/recipesCache';
import CollectionPicker from '../CollectionPicker';

const RecipeDetail: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const { id } = useParams<{ id: string }>();
  const { recipe, loading, error } = useRecipe(id);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!error) return;
    if (isAuthError(error)) {
      logout();
    } else if (recipe !== null) {
      setToastMessage(error.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const buttonsRowRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const currentUrl = window.location.origin + location.pathname;

  if (loading && !recipe) return <div>Lade Rezept...</div>;
  if (error && !recipe) return <div>Fehler: {error.message}</div>;
  if (!recipe) return <div>Rezept nicht gefunden</div>;

  return (
    <>
      <style>{'@media print{@page{size:A4 portrait;margin:5mm}body{margin:0;padding:0;line-height:1.2}}'}</style>
      <div className="py-[10px] md:py-0 print:break-after-page">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="mt-0 mb-2 text-[1.8rem] text-fg">
            {recipe.title}
            {isAuthenticated && (
              <Link
                to={`/edit/${recipe.id}`}
                className="no-print p-2 text-accent transition-colors duration-300 hover:text-accent-dark hover:no-underline"
              >
                <i className="fa-solid fa-pen" />
              </Link>
            )}
          </h1>
          <div className="hidden print:flex print:items-center [&>*:first-child]:print:ml-2">
            Im Browser aufrufen:
            <QRCodeSVG value={currentUrl} size={50} fgColor={'var(--color-accent-dark)'} />
          </div>
        </div>
        <div className="flex flex-col-reverse gap-5 md:flex-row md:gap-[30px] print:flex print:flex-row print:gap-[30px]">
          <div className="flex-1 md:flex-[2] print:flex-[2]">
            <RecipeInstructions instructions={recipe.instructions} />
            <div className="no-print flex flex-col gap-[10px] md:flex-row md:items-stretch" ref={buttonsRowRef}>
              {recipe.url && (
                <a
                  href={recipe.url}
                  className="box-border block w-full rounded-[4px] bg-accent px-4 py-2 text-center font-medium text-white no-underline transition-colors duration-300 hover:bg-accent-dark hover:no-underline md:w-auto"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Zum Originalrezept
                </a>
              )}
              <div className="w-full md:w-auto [&>a]:box-border [&>a]:block [&>a]:w-full">
                <BringButton recipeId={recipe.id} />
              </div>
              {isAuthenticated && <CollectionPicker recipeId={recipe.id} variant="button" />}
            </div>
          </div>
          <RecipeSidebar recipe={recipe} updateRecipe={(r) => upsertRecipe(r)} />
        </div>
      </div>
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </>
  );
};

export default RecipeDetail;
