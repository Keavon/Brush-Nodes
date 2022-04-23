#version 300 es

precision mediump float;

uniform vec2 u_resolution;
uniform float u_falloff;
uniform float u_distance;

in vec2 v_uvCoordinates;

out vec4 Color;

float remap(float x, float x1, float x2, float y1, float y2) {
	float m = (y2 - y1) / (x2 - x1);
	float c = y1 - m * x1;
	return m * x + c;
}

void main() {
	float y = v_uvCoordinates.y;
	if (y > 0.5) y = 1. - y;
	float yBookmatched = remap(y, 0.0, 0.5, 0.0, 1.0);
	float scaled = remap(yBookmatched, (1. - u_distance), 1.0, 0.0, 1.0);
	float strength = pow(scaled, u_falloff);
	
	Color = vec4(vec3(strength), 1);
}