import path from "path";

export default {
  plugins: {
    "@tailwindcss/postcss": {},
    [path.resolve(process.cwd(), "postcss-unwrap-layers.cjs")]: {},
  },
};


