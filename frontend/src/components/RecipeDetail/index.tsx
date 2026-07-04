import React, { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
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

  if (loading && !recipe) return <div>Lade Rezept...</div>;
  if (error && !recipe) return <div>Fehler: {error.message}</div>;
  if (!recipe) return <div>Rezept nicht gefunden</div>;

  return (
    <>
      <div className="py-[10px] md:py-0">
        {/* Screen-only title row (full width). In print the title moves into the
            left column and the QR into the right column (see below). */}
        <div className="mb-4 flex items-center justify-between print:hidden">
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
        </div>
        {/*
          Print: two framed, top-aligned columns — title + instructions on the
          left, QR + image + ingredients on the right (starting at the title
          level so the ingredients use the space next to the title). On screen
          it's the usual two-column flex (order keeps instructions left and the
          image/ingredients right; image on top on mobile).
        */}
        <div className="flex flex-col gap-5 md:flex-row md:gap-[30px] print:flex print:flex-row print:items-start print:gap-[20px]">
          {/* Right column: QR (print only) + image + ingredients */}
          <div className="w-[min(100%,30rem)] md:order-2 print:order-2 print:flex-1">
            {recipe.url && (
              <div className="mb-2 hidden items-center justify-end gap-2 text-fg print:flex">
                Originalrezept:
                <QRCodeSVG value={recipe.url} size={70} fgColor={'var(--color-accent-dark)'} />
              </div>
            )}
            <RecipeSidebar recipe={recipe} updateRecipe={(r) => upsertRecipe(r)} />
          </div>

          {/* Left column: title (print only) + instructions */}
          <div className="flex-1 md:order-1 md:flex-[2] print:order-1 print:flex-[2]">
            <h1 className="mt-0 mb-3 hidden text-[1.6rem] text-fg print:block">{recipe.title}</h1>
            <RecipeInstructions instructions={recipe.instructions} />
            {/* Desktop: a fit-content column grid with 1fr columns, so all three
                buttons take the width of the widest label (not the whole row). */}
            <div
              className="no-print flex flex-col gap-[10px] md:grid md:w-fit md:grid-flow-col md:items-center md:gap-[10px] md:[grid-auto-columns:1fr]"
              ref={buttonsRowRef}
            >
              {recipe.url && (
                <a
                  href={recipe.url}
                  className="box-border flex h-10 w-full items-center justify-center whitespace-nowrap rounded-[4px] bg-accent px-4 text-center font-medium text-white no-underline transition-colors duration-300 hover:bg-accent-dark hover:no-underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Zum Originalrezept
                </a>
              )}
              <div className="w-full [&_button]:whitespace-nowrap [&>a]:box-border [&>a]:block [&>a]:w-full">
                <BringButton recipeId={recipe.id} />
              </div>
              {isAuthenticated && <CollectionPicker recipeId={recipe.id} variant="button" className="w-full" />}
            </div>
          </div>
        </div>
      </div>
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </>
  );
};

export default RecipeDetail;
