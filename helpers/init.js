const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

process.env.NODE_NO_WARNINGS = "1";

// --- Config ---
const rootDir = path.join(__dirname, "..");
const binPath = path.join(rootDir, "bin", "neutralino-win_x64.exe");
const clientLibPath = path.join(rootDir, "resources", "js", "neutralino.js");
const nodeModulesPath = path.join(rootDir, "node_modules");
const cssDir = path.join(rootDir, "resources", "css");

// --- Colors ---
const colors = {
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    gray: "\x1b[90m",
    reset: "\x1b[0m",
};

// --- Helpers ---
function log(step, message) {
    console.log(`${colors.cyan}[${step}]${colors.reset} ${message}`);
}

async function executeCommand(command, args, cwd = rootDir) {
    return new Promise((resolve, reject) => {
        const cmd = process.platform === "win32" && (command === "npm" || command === "npx") ? `${command}.cmd` : command;
        const safeArgs = args.map(a => a.includes(" ") ? `"${a}"` : a);
        const fullCommand = `${cmd} ${safeArgs.join(" ")}`;

        console.log(`   ${colors.gray}→  Exec: ${fullCommand}${colors.reset}`);

        const child = spawn(fullCommand, [], {
            cwd: cwd,
            shell: true,
            env: { ...process.env, NODE_NO_WARNINGS: 1 }
        });

        child.stdout.on("data", () => { });
        child.stderr.on("data", (data) => {
            const str = data.toString();
            const lower = str.toLowerCase();
            const ignore = ["warn", "notice", "deprecation", "update-browserslist-db", "rebuilding", "done in"];
            if (!ignore.some(i => lower.includes(i)) && str.trim().length > 0) {
                console.error(`${colors.red}   [Error] ${str.trim()}${colors.reset}`);
            }
        });

        child.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command failed with code ${code}`));
        });
    });
}

async function runInit() {
    console.log(colors.cyan + "==================================================" + colors.reset);
    console.log(colors.cyan + "           Stable Development Init              " + colors.reset);
    console.log(colors.cyan + "==================================================" + colors.reset);

    // --- STEP 1: CHECK DEPENDENCIES ---
    log("1/6", "Checking NPM Dependencies");
    if (!fs.existsSync(nodeModulesPath)) {
        console.log(`   ${colors.yellow}⚠ node_modules missing. Running 'npm install'...${colors.reset}`);
        try {
            await executeCommand("npm", ["install"]);
            console.log(`   ${colors.green}✔ Dependencies installed.${colors.reset}`);
        } catch (e) {
            console.log(`   ${colors.red}✘ Failed to install dependencies.${colors.reset}`);
            process.exit(1);
        }
    } else {
        console.log(`   ${colors.green}✔ Dependencies present.${colors.reset}`);
    }

    // --- STEP 2: FOLDER STRUCTURE ---
    log("\n2/6", "Checking Folder Structure");
    const requiredDirs = ['models', 'outputs', 'temp', 'resources/css'];

    requiredDirs.forEach(dir => {
        const fullPath = path.join(rootDir, dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            console.log(`   ${colors.green}✔ Created directory: ${dir}${colors.reset}`);
        }
    });
    ['models', 'outputs', 'temp'].forEach(dir => {
        const keep = path.join(rootDir, dir, '.gitkeep');
        if (!fs.existsSync(keep)) fs.writeFileSync(keep, '');
    });
    console.log(`   ${colors.green}✔ Folders verified.${colors.reset}`);

    // --- STEP 3: CHECK NEUTRALINO CORE ---
    log("\n3/6", "Checking Neutralino Core");
    if (fs.existsSync(binPath) && fs.existsSync(clientLibPath)) {
        console.log(`   ${colors.green}✔ Binaries and Client Library present.${colors.reset}`);
    } else {
        console.log(`   ${colors.yellow}⚠ Core files missing. Running 'neu update'...${colors.reset}`);
        try {
            await executeCommand("npx", ["neu", "update"]);
            console.log(`   ${colors.green}✔ Neutralino updated successfully.${colors.reset}`);
        } catch (e) {
            console.log(`   ${colors.red}✘ Failed to download binaries.${colors.reset}`);
        }
    }

    // --- STEP 4: CLEANUP OLD BUILD ---
    log("\n4/6", "Cleaning Old Build Styles");
    const compiledCss = path.join(cssDir, "styles.css");
    if (fs.existsSync(compiledCss)) {
        fs.unlinkSync(compiledCss);
        console.log(`   ${colors.green}✔ Removed old styles.css${colors.reset}`);
    } else {
        console.log(`   ${colors.gray}✔ Nothing to clean.${colors.reset}`);
    }

    // --- STEP 5: BROWSERSLIST ---
    log("\n5/6", "Updating Browserslist");
    try {
        await executeCommand("npx", ["update-browserslist-db@latest"]);
        console.log(`   ${colors.green}✔ DB Updated.${colors.reset}`);
    } catch (e) {
        console.log(`   ${colors.yellow}⚠ Update skipped.${colors.reset}`);
    }

    // --- STEP 6: BUILD CSS ---
    log("\n6/6", "Building CSS");
    try {
        await executeCommand("npm", ["run", "build:css"]);
        console.log(`   ${colors.green}✔ CSS Built successfully.${colors.reset}`);
    } catch (e) {
        console.log(`   ${colors.red}✘ CSS Build failed.${colors.reset}`);
        process.exit(1);
    }

    console.log(colors.cyan + "\n==================================================" + colors.reset);
    console.log(`${colors.green}   Initialization Complete!${colors.reset}`);
    console.log(`   Run ${colors.yellow}npm start${colors.reset} to launch the app.`);
    console.log(colors.cyan + "==================================================" + colors.reset);
}

runInit();