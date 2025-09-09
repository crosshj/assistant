#version 150
uniform vec3  iResolution;
uniform float iTime;
out vec4 fragColor;

// SDF primitives
float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdBox(vec3 p, vec3 b, float r) {
    vec3 q = abs(p) - b;
    return length(max(q,0.0)) - r + min(max(q.x,max(q.y,q.z)),0.0);
}

float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz)-t.x,p.y);
    return length(q)-t.y;
}

// Animated smooth min (blend)
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
    return mix(b, a, h) - k*h*(1.0-h);
}

// Scene SDF
float scene(vec3 p) {
    float s = sdSphere(p - vec3(0.0, 0.5, 0.0), 0.5);
    float b = sdBox(p - vec3(-0.7, -0.2, 0.0), vec3(0.3,0.3,0.3), 0.1);
    float t = sdTorus(p - vec3(0.7, -0.2, 0.0), vec2(0.3,0.1));
    // Animate k between 0.05 and 0.5 over time
    float k = 0.05 + 0.45 * (0.5 + 0.5 * sin(iTime * 0.5));
    float blend = smin(s, b, k);
    blend = smin(blend, t, k);
    return blend;
}

// Normal from SDF
vec3 getNormal(vec3 p) {
    float eps = 0.001;
    vec2 e = vec2(1.0,-1.0)*eps;
    return normalize(vec3(
        scene(p+e.xyy)-scene(p+e.yyy),
        scene(p+e.yxy)-scene(p+e.yyy),
        scene(p+e.yyx)-scene(p+e.yyy)
    ));
}

// Raymarching
float raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    for(int i=0; i<128; i++) {
        vec3 p = ro + rd * t;
        float d = scene(p);
        if(d < 0.001) return t;
        t += d;
        if(t > 10.0) break;
    }
    return -1.0;
}

void main() {
    vec2 uv = (gl_FragCoord.xy / iResolution.xy) * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    // Camera orbit parameters
    float radius = 3.0;
    float camAngle = iTime * 0.4; // speed of rotation
    vec3 ro = vec3(
        radius * sin(camAngle),
        0.0,
        radius * cos(camAngle)
    );
    vec3 target = vec3(0.0, 0.0, 0.0);

    // Camera setup
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = cross(forward, right);

    // Ray direction
    vec3 rd = normalize(forward + uv.x * right + uv.y * up);

    float t = raymarch(ro, rd);
    vec3 col = vec3(0.0);

    if(t > 0.0) {
        vec3 p = ro + rd * t;
        vec3 n = getNormal(p);
        float diff = max(dot(n, normalize(vec3(0.7,0.8,1.0))), 0.0);
        col = mix(vec3(0.2,0.3,0.4), vec3(0.8,0.7,0.5), diff);
    }

    fragColor = vec4(col, 1.0);
}
// ...existing code...