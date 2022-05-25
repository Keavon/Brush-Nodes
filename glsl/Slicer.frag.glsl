#version 300 es

precision mediump float;

uniform vec2 u_resolution;
uniform sampler2D u_sliceable;
uniform float u_depth[1024];

in vec2 v_uvCoordinates;

out vec4 Color;

void main() {
	int depthIndex = int(v_uvCoordinates.x * float(u_depth.length()));
	float depth = u_depth[depthIndex];

	float y = v_uvCoordinates.y;
	
	vec2 crossSectionCoordinates = vec2(depth, y);
	vec3 result = texture(u_sliceable, crossSectionCoordinates).rgb;

	Color = vec4(result.rgb, 1);
}
