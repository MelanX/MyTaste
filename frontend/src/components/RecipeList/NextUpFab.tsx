import React from 'react';
import { Link } from 'react-router-dom';

interface NextUpFabProps {
  count: number;
}

const NextUpFab: React.FC<NextUpFabProps> = ({ count }) => {
  return (
    <Link
      to="/next-up"
      className="fixed bottom-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.5rem))] right-[max(1.25rem,env(safe-area-inset-right))] z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-action text-[1.4rem] text-white no-underline shadow-[0_6px_16px_rgba(0,0,0,0.25)] transition-[transform,box-shadow,background-color] duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-action-dark hover:text-white hover:no-underline hover:shadow-[0_10px_20px_rgba(0,0,0,0.3)] active:translate-y-0 print:hidden"
      aria-label="Next Up öffnen"
      title="Next Up"
    >
      <i className="fa-solid fa-bookmark" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 box-border h-[1.4rem] min-w-[1.4rem] rounded-[5rem] bg-danger-bright px-[0.35rem] text-center text-[0.75rem] font-bold leading-[1.4rem] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
          {count}
        </span>
      )}
    </Link>
  );
};

export default NextUpFab;
