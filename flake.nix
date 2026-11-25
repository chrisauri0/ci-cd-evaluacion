{
  description = "CI/CD + observabilidad (NestJS, pnpm, Playwright) para NixOS";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; config.allowUnfree = true; };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_22
            pnpm
            playwright-driver.browsers
            docker-compose
            awscli2
            git
            gh
            jq
            openssh
          ];

          # Playwright usa los navegadores de Nix (pnpm exec playwright install no funciona en NixOS)
          PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
          PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
          PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";

          shellHook = ''
            echo "Node $(node -v) · pnpm $(pnpm -v)"
            echo "Navegadores Playwright (Nix): $PLAYWRIGHT_BROWSERS_PATH"
            echo "La versión de @playwright/test debe ser ${pkgs.playwright-driver.version}"
            echo "  -> pnpm add -D @playwright/test@${pkgs.playwright-driver.version}"
          '';
        };
      });
}
