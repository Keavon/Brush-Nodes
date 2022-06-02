import * as Vector3 from "/Brush-Nodes/js/Vector3.mjs";

export function identity() {
	return [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1,
	];
}

export function translate(x, y, z) {
	return [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		x, y, z, 1,
	];
}

export function rotateX(radians) {
	const c = Math.cos(radians);
	const s = Math.sin(radians);

	return [
		1, 0, 0, 0,
		0, c, s, 0,
		0, -s, c, 0,
		0, 0, 0, 1,
	];
}

export function rotateY(radians) {
	const c = Math.cos(radians);
	const s = Math.sin(radians);

	return [
		c, 0, -s, 0,
		0, 1, 0, 0,
		s, 0, c, 0,
		0, 0, 0, 1,
	];
}

export function rotateZ(radians) {
	const c = Math.cos(radians);
	const s = Math.sin(radians);

	return [
		c, s, 0, 0,
		-s, c, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1,
	];
}

export function scale(x, y = x, z = x) {
	return [
		x, 0, 0, 0,
		0, y, 0, 0,
		0, 0, z, 0,
		0, 0, 0, 1,
	];
}

export function multiply(a, b) {
	const b00 = b[0 * 4 + 0];
	const b01 = b[0 * 4 + 1];
	const b02 = b[0 * 4 + 2];
	const b03 = b[0 * 4 + 3];
	const b10 = b[1 * 4 + 0];
	const b11 = b[1 * 4 + 1];
	const b12 = b[1 * 4 + 2];
	const b13 = b[1 * 4 + 3];
	const b20 = b[2 * 4 + 0];
	const b21 = b[2 * 4 + 1];
	const b22 = b[2 * 4 + 2];
	const b23 = b[2 * 4 + 3];
	const b30 = b[3 * 4 + 0];
	const b31 = b[3 * 4 + 1];
	const b32 = b[3 * 4 + 2];
	const b33 = b[3 * 4 + 3];
	const a00 = a[0 * 4 + 0];
	const a01 = a[0 * 4 + 1];
	const a02 = a[0 * 4 + 2];
	const a03 = a[0 * 4 + 3];
	const a10 = a[1 * 4 + 0];
	const a11 = a[1 * 4 + 1];
	const a12 = a[1 * 4 + 2];
	const a13 = a[1 * 4 + 3];
	const a20 = a[2 * 4 + 0];
	const a21 = a[2 * 4 + 1];
	const a22 = a[2 * 4 + 2];
	const a23 = a[2 * 4 + 3];
	const a30 = a[3 * 4 + 0];
	const a31 = a[3 * 4 + 1];
	const a32 = a[3 * 4 + 2];
	const a33 = a[3 * 4 + 3];

	const result = [
		(b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30), (b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31), (b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32), (b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33),
		(b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30), (b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31), (b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32), (b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33),
		(b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30), (b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31), (b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32), (b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33),
		(b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30), (b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31), (b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32), (b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33),
	];

	return result;
}

// export function lookAt(eye, target, upDirection = [0, 1, 0]) {
// 	var fwd = Vectors.normalize(Vectors.subtract(target, eye));
// 	var side = Vectors.normalize(Vectors.cross(fwd, upDirection));
// 	var up = Vectors.normalize(Vectors.cross(side, fwd));

// 	return [
// 		side[0], up[0], fwd[0], eye[0],
// 		side[1], up[1], fwd[1], eye[1],
// 		side[2], up[2], fwd[2], eye[2],
// 		0, 0, 0, 1,
// 	];
// }

export function lookAt(eye, target, upDirection = [0, 1, 0]) {
	const forward = Vector3.normalize(Vector3.subtract(target, eye));
	let up = Vector3.normalize(upDirection);
	const right = Vector3.normalize(Vector3.cross(forward, up));
	up = Vector3.cross(right, forward);

	const result = [
		right[0], up[0], -forward[0], 0,
		right[1], up[1], -forward[1], 0,
		right[2], up[2], -forward[2], 0,
		-Vector3.dot(right, eye), -Vector3.dot(up, eye), Vector3.dot(forward, eye), 1,
	];

	return result;
}



export function orthographic(width, height, depth) {
	return [
		2 / width, 0, 0, 0,
		0, -2 / height, 0, 0,
		0, 0, 2 / depth, 0,
		-1, 1, 0, 1,
	];
}

export function perspective(fovRadians, aspect, near, far) {
	var f = 1 / Math.tan(fovRadians / 2);
	const rangeInverse = 1 / (near - far);

	return [
		f / aspect, 0, 0, 0,
		0, f, 0, 0,
		0, 0, (near + far) * rangeInverse, -1,
		0, 0, near * far * rangeInverse * 2, 0
	];
}
