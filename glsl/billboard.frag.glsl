#version 300 es

precision mediump float;

uniform vec2 u_resolution;
uniform float u_seed;
uniform float u_scale;

in vec2 v_texCoord;

out vec4 Color;

// Modified from https://github.com/ashima/webgl-noise/blob/master/src/classicnoise2D.glsl

// GLSL textureless classic 2D noise "cnoise",
// with an RSL-style periodic variant "pnoise".
// Author:  Stefan Gustavson (stefan.gustavson@liu.se)
// Version: 2011-08-22
//
// Many thanks to Ian McEwan of Ashima Arts for the
// ideas for permutation and gradient selection.
//
// Copyright (c) 2011 Stefan Gustavson. All rights reserved.
// Distributed under the MIT license. See LICENSE file.
// https://github.com/stegu/webgl-noise

vec4 mod289(vec4 x) {
	return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
	return mod289(((x * 34.0) + 1.0) * x);
}

vec4 taylorInvSqrt(vec4 r) {
	return 1.79284291400159 - 0.85373472095314 * r;
}

vec2 fade(vec2 t) {
	return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float pnoise(vec2 P, vec2 rep, float seed) {
	vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
	vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
	
	// To create noise with explicit period
	Pi = mod(Pi, rep.xyxy);
	// To avoid truncation effects in permutation
	Pi = mod289(Pi);
	
	vec4 ix = Pi.xzxz;
	vec4 iy = Pi.yyww;
	vec4 fx = Pf.xzxz;
	vec4 fy = Pf.yyww;
	
	vec4 i = permute(permute(permute(ix) + iy) + seed);
	
	vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
	vec4 gy = abs(gx) -0.5;
	vec4 tx = floor(gx + 0.5);
	gx = gx - tx;
	
	vec2 g00 = vec2(gx.x, gy.x);
	vec2 g10 = vec2(gx.y, gy.y);
	vec2 g01 = vec2(gx.z, gy.z);
	vec2 g11 = vec2(gx.w, gy.w);
	
	vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
	g00 *= norm.x;
	g01 *= norm.y;
	g10 *= norm.z;
	g11 *= norm.w;
	
	float n00 = dot(g00, vec2(fx.x, fy.x));
	float n10 = dot(g10, vec2(fx.y, fy.y));
	float n01 = dot(g01, vec2(fx.z, fy.z));
	float n11 = dot(g11, vec2(fx.w, fy.w));
	
	vec2 fade_xy = fade(Pf.xy);
	vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
	float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
	return (2.3 * n_xy) * 0.5 + 0.5;
}

void main() {
	// gl_FragColor = vec4(v_texCoord.xy, 0, 1);
	int x = int(floor(v_texCoord.x * u_resolution.x + 0.5));
	int y = int(floor(v_texCoord.y * u_resolution.y + 0.5));
	
	// bool evenOdd = mod(float(x + y), 2.0) == 0.0;
	
	// if (evenOdd) gl_FragColor = vec4(v_texCoord.xy, 1, 1);
	// else gl_FragColor = vec4(0, 0, 0, 1);
	
	float noiseAtFragment = pnoise(v_texCoord * u_scale, vec2(u_scale, u_scale), u_seed);
	Color = vec4(noiseAtFragment, noiseAtFragment, noiseAtFragment, 1);
}