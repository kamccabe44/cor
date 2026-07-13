export const config = {
  // Local/container build: uses the shared-password server instead of
  // Cognito. Set VITE_LOCAL_MODE=1 at build time (the Docker image does).
  localMode: import.meta.env.VITE_LOCAL_MODE === "1",
  awsRegion: import.meta.env.VITE_AWS_REGION as string,
  cognitoUserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID as string,
  cognitoClientId: import.meta.env.VITE_COGNITO_CLIENT_ID as string,
};

if (!config.localMode && (!config.cognitoUserPoolId || !config.cognitoClientId)) {
  console.error(
    "Missing Cognito config. Expected VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID at build time " +
      "(deploy.sh writes these into .env.production from terraform outputs)."
  );
}
