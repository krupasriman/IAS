import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import Header from './components/layout/Header';
import HomePage from './pages/HomePage';
import TopicPage from './pages/TopicPage';
import AddTopicPage from './pages/AddTopicPage';
import EditTopicPage from './pages/EditTopicPage';
import SettingsPage from './pages/SettingsPage';
import AllTopicsPage from './pages/AllTopicsPage';

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/topics" element={<AllTopicsPage />} />
              <Route path="/topic/:id" element={<TopicPage />} />
              <Route path="/add" element={<AddTopicPage />} />
              <Route path="/edit/:id" element={<EditTopicPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </main>
          <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-400">
              IAS Study App · Personal UPSC Mains Preparation Tool · Built with React
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </SettingsProvider>
  );
}