
import React, { useState, useCallback } from 'react';
import { FeatureId } from './types';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import ImageGenView from './components/ImageGenView';
import ImageEditView from './components/ImageEditView';
import VideoGenView from './components/VideoGenView';
import VideoAnalysisView from './components/VideoAnalysisView';
import LiveConversationView from './components/LiveConversationView';

const App: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<FeatureId>(FeatureId.CHAT);

  const renderActiveFeature = useCallback(() => {
    switch (activeFeature) {
      case FeatureId.CHAT:
        return <ChatView />;
      case FeatureId.IMAGE_GEN:
        return <ImageGenView />;
      case FeatureId.IMAGE_EDIT:
        return <ImageEditView />;
      case FeatureId.VIDEO_GEN:
        return <VideoGenView />;
      case FeatureId.VIDEO_ANALYSIS:
        return <VideoAnalysisView />;
      case FeatureId.LIVE_CONVERSATION:
        return <LiveConversationView />;
      default:
        return <ChatView />;
    }
  }, [activeFeature]);

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
      <Sidebar activeFeature={activeFeature} setActiveFeature={setActiveFeature} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {renderActiveFeature()}
      </main>
    </div>
  );
};

export default App;
