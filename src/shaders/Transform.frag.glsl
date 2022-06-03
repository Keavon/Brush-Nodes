#version 300 es

precision mediump float;

uniform ivec2 u_resolution;
uniform sampler2D u_foreground;
uniform bool u_foregroundExists;
uniform float u_scale_x;
uniform float u_scale_y;
uniform float u_offset_x;
uniform float u_offset_y;
uniform float u_rotation;
in vec2 v_uvCoordinates;
out vec4 Color;

vec2 rotateUV(vec2 uv, float rotation, vec2 mid)
{
	float rads = rotation / 57.2958;
    return vec2(
        cos(rads) * (uv.x - mid.x) + sin(rads) * (uv.y - mid.y) + mid.y,
        cos(rads) * (uv.y - mid.y) - sin(rads) * (uv.x - mid.x) + mid.x
    );
}


void main() {
	if (!u_foregroundExists) {
		Color = vec4(0, 0, 0, 1);
		return;
	}

	// Transform the UV coordinates such that we can offset, scale and rotate
	vec2 uv = v_uvCoordinates;
	uv = rotateUV(uv, u_rotation, vec2(0.5, 0.5));
	uv = vec2(u_offset_x, u_offset_y)  + uv;
	uv = vec2(u_scale_x, u_scale_y) * fract(uv);

	Color = texture(u_foreground, uv);
}
