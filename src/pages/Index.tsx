import AppLayout from '@/components/AppLayout';
import { AppProvider } from '@/contexts/AppContext';


import { useAppContext } from '@/contexts/AppContext';
import Login from './Login';

const Index: React.FC = () => {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
};

function MainContent() {
  const { userRole } = useAppContext();
  if (!userRole) return <Login />;
  return <AppLayout />;
}

export default Index;
