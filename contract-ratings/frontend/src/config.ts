export const config = {
  awsRegion: import.meta.env.VITE_AWS_REGION as string,
  cognitoUserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID as string,
  cognitoClientId: import.meta.env.VITE_COGNITO_CLIENT_ID as string,
};

if (!config.cognitoUserPoolId || !config.cognitoClientId) {
  console.error(
    "Missing Cognito config. Expected VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID at build time " +
      "(deploy.sh writes these into .env.production from terraform outputs)."
  );
}
