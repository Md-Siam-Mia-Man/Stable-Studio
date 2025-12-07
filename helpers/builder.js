const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");

process.env.NODE_NO_WARNINGS = "1";

const colors = {
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    gray: "\x1b[90m",
    reset: "\x1b[0m",
};

function log(step, message) {
    console.log(`${colors.cyan}[${step}]${colors.reset} ${message}`);
}

async function executeCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
        const cmd = process.platform === "win32" && command === "npm" ? "npm.cmd" :
            process.platform === "win32" && command === "npx" ? "npx.cmd" : command;

        // FIX: Manually construct command string to avoid DEP0190 warning
        const safeArgs = args.map(a => a.includes(" ") ? `"${a}"` : a);
        const fullCommand = `${cmd} ${safeArgs.join(" ")}`;

        console.log(`   ${colors.gray}→  Exec: ${fullCommand}${colors.reset}`);

        const child = spawn(fullCommand, [], {
            cwd: cwd,
            shell: true,
            env: { ...process.env, NODE_NO_WARNINGS: 1 }
        });

        child.stdout.on("data", (data) => {
            // Uncomment to see logs
            // console.log(colors.gray + "   [Log] " + data.toString().trim() + colors.reset);
        });

        child.stderr.on("data", (data) => {
            const str = data.toString();
            const lower = str.toLowerCase();

            // List of keywords that are NOT real errors
            const ignoreKeywords = [
                "warn",
                "notice",
                "deprecationwarning",
                "browserslist",
                "caniuse-lite",
                "update-browserslist-db",
                "rebuilding",
                "done in"
            ];

            const isIgnorable = ignoreKeywords.some(key => lower.includes(key));

            // Only print if it's NOT in the ignore list and has actual content
            if (!isIgnorable && str.trim().length > 0) {
                console.error(`${colors.red}   [Error] ${str.trim()}${colors.reset}`);
            }
        });

        child.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command failed with code ${code}`));
        });
    });
}

function getNSISPath() {
    try {
        require("child_process").execSync("makensis /VERSION", { stdio: "ignore" });
        return "makensis";
    } catch (e) {
        const commonPaths = [
            "C:\\Program Files (x86)\\NSIS\\makensis.exe",
            "C:\\Program Files\\NSIS\\makensis.exe"
        ];
        for (const p of commonPaths) {
            if (fs.existsSync(p)) return `"${p}"`;
        }
        throw new Error("NSIS (makensis.exe) not found. Please install NSIS.");
    }
}

function findExeInDir(dir) {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file.endsWith(".exe")) return file;
    }
    return null;
}

async function runBuild() {
    const rootDir = path.join(__dirname, "..");
    const distDir = path.join(rootDir, "dist");
    const releaseDir = path.join(rootDir, "release");
    const configPath = path.join(rootDir, "neutralino.config.json");
    const sourceBinPath = path.join(rootDir, "bin", "neutralino-win_x64.exe");

    // Read Config
    if (!fs.existsSync(configPath)) throw new Error("neutralino.config.json not found");
    const neuConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const binaryName = neuConfig.cli.binaryName || "Stable-Studio-Installer";

    console.log(colors.cyan + "==================================================" + colors.reset);
    console.log(colors.cyan + "            Stable Studio Builder               " + colors.reset);
    console.log(colors.cyan + "==================================================" + colors.reset);

    // --- STEP 0: PRE-CHECKS ---
    log("0/6", "Checking Dependencies");

    // 0a. Check Binaries
    if (!fs.existsSync(sourceBinPath)) {
        console.log(`   ${colors.yellow}⚠ Binaries missing. Running 'neu update'...${colors.reset}`);
        await executeCommand("npx", ["neu", "update"], rootDir);
    }

    // 0b. Update Browserslist
    console.log(`   ${colors.gray}Updating Browserslist DB...${colors.reset}`);
    try {
        await executeCommand("npx", ["update-browserslist-db@latest"], rootDir);
    } catch (e) {
        console.log(`   ${colors.yellow}⚠ Skipped Browserslist update.${colors.reset}`);
    }

    // --- STEP 1: CLEANUP ---
    log("\n1/6", "Cleanup");
    const pathsToClean = [distDir, releaseDir];
    for (const p of pathsToClean) {
        if (fs.existsSync(p)) {
            try {
                if (rimraf.sync) rimraf.sync(p);
                else await rimraf(p);
            } catch (e) { }
        }
    }
    if (!fs.existsSync(releaseDir)) fs.mkdirSync(releaseDir, { recursive: true });
    console.log(`   ${colors.green}✔ Cleaned old build artifacts.${colors.reset}`);

    // --- STEP 2: CSS BUILD ---
    log("\n2/6", "Compiling Styles");
    try {
        await executeCommand("npm", ["run", "build:css"], rootDir);
        console.log(`   ${colors.green}✔ CSS Compiled.${colors.reset}`);
    } catch (e) {
        throw new Error("CSS Compilation failed.");
    }

    // --- STEP 3: APP BUILD (Neutralino) ---
    log("\n3/6", "Building Application (Neutralinojs)");
    try {
        await executeCommand("npx", ["neu", "build"], rootDir);

        const expectedBuildDir = path.join(distDir, binaryName);
        let targetDir = expectedBuildDir;

        if (!fs.existsSync(targetDir)) {
            const subdirs = fs.readdirSync(distDir).filter(f => fs.statSync(path.join(distDir, f)).isDirectory());
            if (subdirs.length > 0) targetDir = path.join(distDir, subdirs[0]);
            else throw new Error("No output folder found in dist/");
        }

        let exeFile = findExeInDir(targetDir);

        if (!exeFile) {
            console.warn(colors.yellow + "   [Warn] Binary missing in dist. Copying fallback..." + colors.reset);
            if (fs.existsSync(sourceBinPath)) {
                fs.copyFileSync(sourceBinPath, path.join(targetDir, "Stable-Studio-Installer.exe"));
                exeFile = "Stable-Studio-Installer.exe";
            } else {
                throw new Error("Critical: No binary found.");
            }
        }

        if (exeFile !== "Stable-Studio-Installer.exe") {
            fs.renameSync(path.join(targetDir, exeFile), path.join(targetDir, "Stable-Studio-Installer.exe"));
            console.log(`   ${colors.green}✔ Renamed ${exeFile} to Stable-Studio-Installer.exe${colors.reset}`);
        }

    } catch (e) {
        throw new Error("Neutralino Build failed: " + e.message);
    }

    // --- STEP 4: INSTALLER (NSIS) ---
    log("\n4/6", "Building Installer (NSIS)");
    const nsisPath = getNSISPath();
    console.log(`   ${colors.gray}Using NSIS at: ${nsisPath}${colors.reset}`);

    try {
        await executeCommand(nsisPath, ["installer.nsi"], rootDir);
        console.log(`   ${colors.green}✔ Installer Compiled.${colors.reset}`);
    } catch (e) {
        throw new Error("NSIS Compilation failed.");
    }

    // --- STEP 5: FINALIZE ---
    log("\n5/6", "Finalizing");
    const setupFile = "Stable_Studio_Setup.exe";
    const sourcePath = path.join(rootDir, setupFile);
    const destPath = path.join(releaseDir, setupFile);

    if (fs.existsSync(sourcePath)) {
        fs.renameSync(sourcePath, destPath);
        console.log(`   ${colors.green}✔ Installer moved to release/.${colors.reset}`);
    } else {
        throw new Error("Output installer not found.");
    }

    console.log(colors.cyan + "\n==================================================" + colors.reset);
    console.log(`${colors.green}   Build Successful!${colors.reset}`);
    console.log(`   Installer: ${destPath}`);
    console.log(colors.cyan + "==================================================" + colors.reset);
}

runBuild().catch(err => {
    console.error(`\n${colors.red}[FATAL] ${err.message}${colors.reset}`);
    process.exit(1);
});