import WelcomePage from './_shared/WelcomePage';

export function Current() {
  return (
    <WelcomePage
      onSignUp={() => undefined}
      onSignIn={() => undefined}
      onContinueAsGuest={() => undefined}
    />
  );
}
