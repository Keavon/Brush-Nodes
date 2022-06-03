const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");

module.exports = {
	entry: "./src/main.js",
	output: {
		filename: "bundle.js",
		path: path.resolve(__dirname, "dist"),
		clean: true,
	},
	resolve: {
		extensions: [".js"],
		alias: {
			"@": path.resolve(__dirname, "src/"),
		},
	},
	module: {
		rules: [
			{
				test: /\.scss$/i,
				use: ["style-loader", "css-loader", "sass-loader"],
			},
			{
				test: /\.(obj|png|svg|jpg|jpeg|gif)$/i,
				type: "asset/resource",
			},
			{
				test: /\.glsl$/i,
				type: "asset/source",
			},
		],
	},
	plugins: [
		new CopyPlugin({
			patterns: [{ from: "./public", to: "" }],
		}),
	],
	mode: "development",
	devtool: "inline-source-map",
	devServer: {
		static: "./dist",
		hot: true,
	},
	watchOptions: {
		ignored: /node_modules/,
	},
};
