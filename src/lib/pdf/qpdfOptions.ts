export type QpdfAction =
  "protect" | "unlock" | "optimize" | "repair" | "inspect";
export function qpdfArgs(
  action: QpdfAction,
  password = "",
  ownerPassword = "",
): string[] {
  const input = "/input.pdf",
    output = "/output.pdf";
  if (action === "inspect")
    return [
      input,
      `--password=${password}`,
      "--json",
      "--json-key=encrypt",
      "/inspection.json",
    ];
  if (action === "protect") {
    if (password.length < 8)
      throw new Error("Use a password with at least 8 characters.");
    return [
      input,
      "--encrypt",
      `--user-password=${password}`,
      `--owner-password=${ownerPassword}`,
      "--bits=256",
      "--",
      output,
    ];
  }
  if (action === "unlock") {
    return [input, `--password=${password}`, "--decrypt", output];
  }
  if (action === "optimize")
    return [
      input,
      "--object-streams=generate",
      "--compress-streams=y",
      "--recompress-flate",
      "--compression-level=9",
      output,
    ];
  return [input, "--object-streams=generate", output];
}
