#version 300 es

precision mediump float;

uniform ivec2 u_resolution;
uniform int u_style;
uniform float u_falloff;
uniform float u_thickness;
uniform float u_radius;

in vec2 v_uvCoordinates;

out vec4 Color;

float remap(float x, float x1, float x2, float y1, float y2) {
	float m = (y2 - y1) / (x2 - x1);
	float c = y1 - m * x1;
	return m * x + c;
}

void main() {
	float y = v_uvCoordinates.y;
	float x = v_uvCoordinates.x;

	float strength = 0.;

	switch (u_style) {
		case 0: // Linear Horizontal
			strength = remap(x, (1. - u_thickness), 1.0, 0.0, 1.0);
			break;
		case 1: // Linear Vertical
			strength = remap(y, (1. - u_thickness), 1.0, 0.0, 1.0);
			break;
		case 2: // Bookmatched X
			if (y > 0.5) y = 1. - y;
			float xBookmatched = remap(y, 0.0, 0.5, 0.0, 1.0);
			strength = remap(xBookmatched, (1. - u_thickness), 1.0, 0.0, 1.0);
			break;
		case 3: // Bookmatched Y
			if (x > 0.5) x = 1. - x;
			float yBookmatched = remap(x, 0.0, 0.5, 0.0, 1.0);
			strength = remap(yBookmatched, (1. - u_thickness), 1.0, 0.0, 1.0);
			break;
		case 4: // Radial
			float xOffset = (x - 0.5) * 2.;
			float yOffset = (y - 0.5) * 2.;
			float hypotenuse = sqrt(xOffset * xOffset + yOffset * yOffset);
			strength = remap(hypotenuse, max(0., u_radius - u_thickness), u_radius, 0.0, 1.0);
			break;
		default:
			Color = vec4(1., 0., 0., 1.);
			return;
	}

	float result = pow(strength, u_falloff);
	
	Color = vec4(vec3(result), 1);
}
