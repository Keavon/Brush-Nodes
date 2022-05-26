#version 300 es

precision mediump float;

uniform ivec2 u_resolution;
uniform sampler2D u_inputTexture;
uniform sampler2D u_outputTexture;
uniform float u_shadows;
uniform float u_midtones;
uniform float u_highlights;
uniform float u_minimums;
uniform float u_maximums;

in vec2 v_uvCoordinates;

out vec4 Color;

void main() {
	vec3 inputColor = texture(u_inputTexture, v_uvCoordinates).rgb;
	
	// Midtones interpolation factor between minimums and maximums
	float midtones = u_minimums + (u_maximums - u_minimums) * u_midtones;

	// Algorithm from https://stackoverflow.com/questions/39510072/algorithm-for-adjustment-of-image-levels

	// Gamma correction
	float gamma = 1.;
	if (midtones < 0.5) {
		midtones *= 2.;
		gamma = 1. + (9. * (1. - midtones));
		gamma = min(gamma, 9.99);
	} else {
		midtones = (midtones * 2.) - 1.;
		gamma = 1. - midtones;
		gamma = max(gamma, 0.01);
	}
	float gammaCorrection = 1. / gamma;

	// Input levels
	vec3 result = ((inputColor - u_shadows) / (u_highlights - u_shadows));

	// Midtones
	result.r = pow(result.r, gammaCorrection);
	result.g = pow(result.g, gammaCorrection);
	result.b = pow(result.b, gammaCorrection);

	// Output levels
	result = result * (u_maximums - u_minimums) + u_minimums;

	Color = vec4(result.rgb, 1.);
}
