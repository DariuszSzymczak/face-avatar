import { SignIn, SignUp } from "@clerk/react";
import { Sparkles } from "lucide-react";

export default function AuthPage({ mode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-white/10 relative overflow-hidden">
        <div className="auth-orb" />
        <div className="flex items-center gap-2 relative"><span className="logo-mark"><Sparkles size={16} /></span><span className="font-display font-extrabold text-lg">AniEmotion</span></div>
        <div className="relative space-y-5 max-w-md">
          <h1 className="font-display text-5xl lg:text-6xl font-black leading-none tracking-tight">Twoja twarz.<br /><span className="grad">Twoje anime.</span></h1>
          <p className="text-slate-300">Wgraj zdjęcie, a AI narysuje Twojego avatara anime. Potem włącz kamerkę — avatar powtarza ruchy głowy, mimikę i emocje z Twojego głosu w czasie rzeczywistym.</p>
        </div>
        <p className="caption relative">Radość · Smutek · Złość · Zaskoczenie</p>
      </div>
      <div className="flex items-center justify-center p-4" data-testid={`auth-${mode}-container`}>
        {mode === "sign-in" ? <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" withSignUp /> : <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />}
      </div>
    </div>
  );
}
