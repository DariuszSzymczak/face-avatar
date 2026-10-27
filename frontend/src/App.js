import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Show } from "@clerk/react";
import { Toaster } from "@/components/ui/sonner";
import ClerkAuthProvider from "@/components/auth/ClerkAuthProvider";
import Studio from "@/pages/Studio";
import AuthPage from "@/pages/AuthPage";

const Home = () => (
  <>
    <Show when="signed-in"><Studio /></Show>
    <Show when="signed-out"><Navigate to="/sign-in" replace /></Show>
  </>
);

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <ClerkAuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sign-in/*" element={<AuthPage mode="sign-in" />} />
            <Route path="/sign-up/*" element={<AuthPage mode="sign-up" />} />
          </Routes>
        </ClerkAuthProvider>
      </BrowserRouter>
      <Toaster theme="dark" position="top-right" />
    </div>
  );
}

export default App;
