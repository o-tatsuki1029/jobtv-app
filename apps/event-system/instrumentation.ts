export async function register() {
  const { configureDevelopmentTLS } = await import(
    "@jobtv-app/shared/utils/dev-config"
  );
  configureDevelopmentTLS();
}
