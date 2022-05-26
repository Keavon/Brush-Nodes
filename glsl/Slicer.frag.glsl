#version 300 es

precision mediump float;

uniform ivec2 u_resolution;
uniform sampler2D u_sliceable;
uniform sampler2D u_depth_bit_texture;

in vec2 v_uvCoordinates;

out vec4 Color;

float getDepth(int index) {
	ivec2 dimensions = textureSize(u_depth_bit_texture, 0);
	int x = index % dimensions.x;
	int y = index / dimensions.x;
	vec2 coordinate = vec2(x, y) / vec2(dimensions);

	float depth = texture(u_depth_bit_texture, coordinate).r;
	return depth;
}

void main() {
	int depthIndex = int(floor(v_uvCoordinates.x * float(u_resolution.x)));
	float depth = getDepth(depthIndex);

	vec2 crossSectionCoordinates = vec2(depth, v_uvCoordinates.y);
	
	vec3 result = texture(u_sliceable, crossSectionCoordinates).rgb;

	Color = vec4(result, 1);
}
