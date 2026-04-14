import React from 'react';
import MinimalLayout from '../layouts/MinimalLayout.jsx';
import ClassicLayout from '../layouts/ClassicLayout.jsx';
import ModernLayout from '../layouts/ModernLayout.jsx';

const GameScreen = ({ layoutType }) => {
  switch (layoutType) {
    case 'classic': return <ClassicLayout />;
    case 'modern': return <ModernLayout />;
    case 'minimal':
    default:
      return <MinimalLayout />;
  }
};
export default GameScreen;
