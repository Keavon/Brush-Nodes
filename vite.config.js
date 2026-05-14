import { defineConfig } from "vite";
import { readFile } from "fs/promises";

export default defineConfig({
	// Relative base so the build works both at the GitHub Pages subpath and locally
	base: "./",
	plugins: [glslAsString(), objAsMesh()],
	server: {
		port: 3000,
	},
});

function glslAsString() {
	return {
		name: "glsl-as-string",
		enforce: "pre",
		async load(id) {
			if (!id.endsWith(".glsl")) return null;
			const source = await readFile(id, "utf-8");
			return `export default ${JSON.stringify(source)};`;
		},
	};
}

function objAsMesh() {
	return {
		name: "obj-as-mesh",
		enforce: "pre",
		async load(id) {
			if (!id.endsWith(".obj")) return null;
			const source = await readFile(id, "utf-8");
			const mesh = parseObj(source);
			return `export default ${JSON.stringify(mesh)};`;
		},
	};
}

function parseObj(source) {
	const positions = [];
	const uvs = [];
	const normals = [];

	const vertices = [];
	const textures = [];
	const vertexNormals = [];
	const indices = [];
	const cache = new Map();

	const indexFor = (spec) => {
		const cached = cache.get(spec);
		if (cached !== undefined) return cached;

		const [vStr, vtStr, vnStr] = spec.split("/");
		const outIndex = vertices.length / 3;

		const position = positions[parseInt(vStr, 10) - 1];
		vertices.push(position[0], position[1], position[2]);

		if (vtStr) {
			const uv = uvs[parseInt(vtStr, 10) - 1];
			textures.push(uv[0], uv[1]);
		}

		if (vnStr) {
			const normal = normals[parseInt(vnStr, 10) - 1];
			vertexNormals.push(normal[0], normal[1], normal[2]);
		}

		cache.set(spec, outIndex);
		return outIndex;
	};

	for (const rawLine of source.split("\n")) {
		const line = rawLine.trim();
		if (line === "" || line.startsWith("#")) continue;

		const parts = line.split(/\s+/);
		const command = parts[0];

		if (command === "v") {
			positions.push([+parts[1], +parts[2], +parts[3]]);
		}
		else if (command === "vt") {
			uvs.push([+parts[1], +parts[2]]);
		}
		else if (command === "vn") {
			normals.push([+parts[1], +parts[2], +parts[3]]);
		}
		else if (command === "f") {
			const face = parts.slice(1).map(indexFor);
			// Triangulate as a fan: works for any convex polygon (triangles and quads in our meshes)
			for (let i = 1; i < face.length - 1; i++) {
				indices.push(face[0], face[i], face[i + 1]);
			}
		}
	}

	return { vertices, textures, vertexNormals, indices };
}
