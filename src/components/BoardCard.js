import React from "react";

const BoardCard = ({ title }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
      <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
        {title}
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Click to open board
      </p>
    </div>
  );
};

export default BoardCard;
