import { Routes, Route, Navigate } from "react-router";
import socket from "./socket/socket";
import { useEffect } from "react";

import LoginPage from "./pages/LoginPage";

import ProtectedRoute from "./routes/ProtectedRoute";
import ModuleProtectedRoute from "./routes/ModuleProtectedRoute";

import DashboardLayout from "./layouts/DashboardLayout";

import DashboardHome from "./pages/dashboard/DashboardHome";
import FeedPage from "./pages/dashboard/FeedPage";
import SinglePostPage from "./pages/dashboard/SinglePostPage";
import MarketplacePage from "./pages/dashboard/MarketplacePage";
import ChatPage from "./pages/dashboard/ChatPage";
import ConfessionsPage from "./pages/dashboard/ConfessionsPage";
import LibraryPage from "./pages/dashboard/LibraryPage";
import AcademicHubPage from "./pages/dashboard/AcademicHubPage";
import EventsPage from "./pages/dashboard/EventsPage";
import LostFoundPage from "./pages/dashboard/LostFoundPage";
import PollsPage from "./pages/dashboard/PollsPage";
import SustainabilityPage from "./pages/dashboard/SustainabilityPage";
import AdminPage from "./pages/dashboard/AdminPage";
import GlobalPage from "./pages/dashboard/GlobalPage";
import ProfilePage from "./pages/dashboard/ProfilePage";

import SavedPostsPage from "./pages/profile/SavedPostsPage";
import UserProfilePage from "./pages/dashboard/UserProfilePage";

const App = () => {
  useEffect(() => {
  if (!socket.connected) {
    socket.connect();
  }

  const handleConnect = () => {
    console.log(
      "Connected:",
      socket.id
    );
  };

  const handleWelcome = (
    msg
  ) => {
    console.log(msg);
  };

  socket.on(
    "connect",
    handleConnect
  );

  socket.on(
    "welcome",
    handleWelcome
  );

  return () => {
    socket.off(
      "connect",
      handleConnect
    );

    socket.off(
      "welcome",
      handleWelcome
    );
  };
}, []);
  return (
    <Routes>
      {/* FIXED ROOT REDIRECT */}
      <Route path="/" element={<Navigate to="/dashboard/feed" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <ModuleProtectedRoute moduleName="dashboard">
              <DashboardHome />
            </ModuleProtectedRoute>
          }
        />

        <Route
          path="feed"
          element={
            <ModuleProtectedRoute moduleName="feed">
              <FeedPage />
            </ModuleProtectedRoute>
          }
        />
        <Route
          path="post/:id"
          element={
            <ModuleProtectedRoute moduleName="feed">
              <SinglePostPage />
            </ModuleProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ModuleProtectedRoute moduleName="dashboard">
              <ProfilePage />
            </ModuleProtectedRoute>
          }
        />

        <Route
          path="saved"
          element={
            <ModuleProtectedRoute moduleName="feed">
              <SavedPostsPage />
            </ModuleProtectedRoute>
          }
        />

        <Route
          path="user/:id"
          element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="marketplace"
          element={
            <ModuleProtectedRoute moduleName="marketplace">
              <MarketplacePage />
            </ModuleProtectedRoute>
          }
        />

        <Route
          path="chat"
          element={
            <ModuleProtectedRoute moduleName="messaging">
              <ChatPage />
            </ModuleProtectedRoute>
          }
        />

        <Route
          path="confessions"
          element={
            <ModuleProtectedRoute moduleName="confessions">
              <ConfessionsPage />
            </ModuleProtectedRoute>
          }
        />

        <Route
          path="library"
          element={
            <ModuleProtectedRoute moduleName="library">
              <LibraryPage />
            </ModuleProtectedRoute>
          }
        />

        <Route
          path="academic-hub"
          element={
            <ModuleProtectedRoute moduleName="academicHub">
              <AcademicHubPage />
            </ModuleProtectedRoute>
          }
        />

        <Route
          path="events"
          element={
            <ModuleProtectedRoute moduleName="events">
              <EventsPage />
            </ModuleProtectedRoute>
          }
        />

        <Route
          path="lost-found"
          element={
            <ModuleProtectedRoute moduleName="lostFound">
              <LostFoundPage />
            </ModuleProtectedRoute>
          }
        />

        <Route
          path="polls"
          element={
            <ModuleProtectedRoute moduleName="polls">
              <PollsPage />
            </ModuleProtectedRoute>
          }
        />

        <Route
          path="sustainability"
          element={
            <ModuleProtectedRoute moduleName="sustainability">
              <SustainabilityPage />
            </ModuleProtectedRoute>
          }
        />

        <Route
          path="admin"
          element={
            <ModuleProtectedRoute moduleName="adminPanel">
              <AdminPage />
            </ModuleProtectedRoute>
          }
        />

        <Route
          path="global"
          element={
            <ModuleProtectedRoute moduleName="globalAccess">
              <GlobalPage />
            </ModuleProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
};

export default App;
