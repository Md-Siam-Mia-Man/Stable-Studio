/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class', // Manual toggle via "dark" class on html/body
    content: ["./resources/**/*.{html,js}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Poppins', 'sans-serif'], // Default font
                poppins: ['Poppins', 'sans-serif'],
            },
            colors: {
                // Strict Palette
                'cream': '#ffffb7',
                'vanilla': '#fff8a5',
                'light-gold': '#fff599',
                'banana': '#fff185',
                'banana-2': '#ffee70',
                'banana-3': '#ffec5c',
                'banana-4': '#ffe747',
                'sunbeam': '#ffe433',
                'bright-gold': '#ffdd1f',
                'bright-gold-2': '#ffda0a',

                // Gradient Stop (Orange-ish)
                'gradient-start': '#FF930F',
                'gradient-end': '#FFF95B',

                // Neutrals (Standardized for visibility against the yellow)
                'dark-bg': '#0f0f0f',
                'dark-surface': '#1a1a1a',
                'light-bg': '#ffffff',
                'light-surface': '#f9f9f9',
            },
            backgroundImage: {
                'gold-gradient': 'linear-gradient(90deg, #FF930F, #FFF95B)',
                'gold-gradient-hover': 'linear-gradient(90deg, #ffda0a, #ffe433)',
            }
        },
    },
    plugins: [],
}