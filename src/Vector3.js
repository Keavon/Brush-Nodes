export function dot(a, b) {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a, b) {
	return [
		a[1] * b[2] - a[2] * b[1],
		a[2] * b[0] - a[0] * b[2],
		a[0] * b[1] - a[1] * b[0]
	];
}

export function scale(vector, factor) {
	return [vector[0] * factor, vector[1] * factor, vector[2] * factor];
}

export function add(a, b) {
	return [
		a[0] + b[0],
		a[1] + b[1],
		a[2] + b[2]
	];
}

export function subtract(a, b) {
	return [
		a[0] - b[0],
		a[1] - b[1],
		a[2] - b[2]
	];
}

export function normalize(vector) {
	const length = magnitude(vector);
	if (length < 0.000001) return [0, 0, 0];
	return [vector[0] / length, vector[1] / length, vector[2] / length];
}

export function magnitude(vector) {
	return Math.sqrt(vector[0] * vector[0] + vector[1] * vector[1] + vector[2] * vector[2]);
}