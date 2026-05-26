import("./dist/main/main.js").catch((error) => {
  console.error("[nexus] failed to start main process");
  console.error(error);
  process.exitCode = 1;
});
