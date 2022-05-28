#version 300 es

in vec4 a_vertexCoordinates;
in vec3 a_normalVectors;
in vec2 a_uvCoordinates;

uniform ivec2 u_resolution;
uniform sampler2D u_diffuse;

out vec2 v_uvCoordinates;
out vec3 v_normalVectors;

void main() {
	ivec2 textureDimensions = textureSize(u_diffuse, 0);
	
	float viewportX = float(u_resolution.x);
	float viewportY = float(u_resolution.y);
	float viewportAspectRatio = viewportX / viewportY;
	
	float yViewportScale = viewportAspectRatio;

	float textureX = float(textureDimensions.x);
	float textureY = float(textureDimensions.y);

	float yTextureScale = textureY / textureX;
	
	v_uvCoordinates = a_uvCoordinates;
	v_normalVectors = a_normalVectors;
	gl_Position = vec4(a_vertexCoordinates.x, a_vertexCoordinates.y * yViewportScale * yTextureScale, 0, 1);
}
