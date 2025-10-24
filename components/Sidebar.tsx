
import React from 'react';
import { FeatureId } from '../types';
import ChatIcon from './icons/ChatIcon';
import ImageIcon from './icons/ImageIcon';
import EditIcon from './icons/EditIcon';
import VideoIcon from './icons/VideoIcon';
import AnalysisIcon from './icons/AnalysisIcon';
import LiveIcon from './icons/LiveIcon';

interface SidebarProps {
  activeFeature: FeatureId;
  setActiveFeature: (feature: FeatureId) => void;
}

const features = [
  { id: FeatureId.CHAT, name: 'Multimodal Chat', icon: ChatIcon },
  { id: FeatureId.IMAGE_GEN, name: 'Image Generation', icon: ImageIcon },
  { id: FeatureId.IMAGE_EDIT, name: 'Image Editing', icon: EditIcon },
  { id: FeatureId.VIDEO_GEN, name: 'Video Generation', icon: VideoIcon },
  { id: FeatureId.VIDEO_ANALYSIS, name: 'Video Analysis', icon: AnalysisIcon },
  { id: FeatureId.LIVE_CONVERSATION, name: 'Live Conversation', icon: LiveIcon },
];

const Sidebar: React.FC<SidebarProps> = ({ activeFeature, setActiveFeature }) => {
  return (
    <nav className="w-64 bg-gray-900 border-r border-gray-700 p-4 flex flex-col">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg"></div>
        <h1 className="text-xl font-bold text-white">Gemini Multiverse</h1>
      </div>
      <ul className="space-y-2">
        {features.map((feature) => (
          <li key={feature.id}>
            <button
              onClick={() => setActiveFeature(feature.id)}
              className={`w-full flex items-center p-3 rounded-lg transition-colors duration-200 ${
                activeFeature === feature.id
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <feature.icon className="w-6 h-6 mr-3" />
              <span className="font-medium">{feature.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-auto text-center text-gray-500 text-xs">
          <p>Powered by Google Gemini</p>
      </div>
    </nav>
  );
};

export default Sidebar;
