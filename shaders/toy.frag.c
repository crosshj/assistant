#version 150
uniform vec3  iResolution;
uniform float iTime;
uniform vec4  iMouse; // iMouse.z changes on click
out vec4 fragColor;

vec3 palette(float t) {
    float stripes = step(0.5, fract(t * 300.0 + iTime * 0.5));
    vec3 stripeColor = mix(vec3(0.1, 0.8, 1.0), vec3(1.0, 0.2, 0.5), stripes);
    vec3 gradColor = 0.6 + 0.6 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + t + iTime * 0.2));
    vec3 col = mix(stripeColor, gradColor, 0.5);
    col = pow(col, vec3(0.9));
    return col;
}

void getPair(int idx, out vec2 center, out float zoom) {
    if (idx == 0) { center = vec2(-0.1011, 0.9563); zoom = 5000.0; } // top bud
    else if (idx == 1) { center = vec2(-1.749, 0.0); zoom = 300.0; } // antenna tip
    else if (idx == 2) { center = vec2(-0.1592, 1.0368); zoom = 8000.0; } // spiral
    else if (idx == 3) { center = vec2(-0.74364388703, 0.13182590421); zoom = 4500.0; } // deep zoom
    else if (idx == 4) { center = vec2(-0.7435, 0.1100); zoom = 3000.0; } // spiral valley
    else if (idx == 5) { center = vec2(-0.745, 0.112); zoom = 8000.0; } // seahorse valley
    else if (idx == 6) { center = vec2(-1.25066, 0.02012); zoom = 12000.0; } // elephant valley
    else if (idx == 7) { center = vec2(-0.748, 0.1); zoom = 10000.0; } // minibrot
    else if (idx == 8) { center = vec2(-0.743, 0.131); zoom = 20000.0; } // spiral
    else if (idx == 9) { center = vec2(-0.743643887037151, 0.131825904205330); zoom = 100000.0; } // famous zoom
    else if (idx == 10) { center = vec2(-0.743643887037151, 0.131825904205330); zoom = 50000.0; }
    else if (idx == 11) { center = vec2(-0.743643887037151, 0.131825904205330); zoom = 25000.0; }
    else if (idx == 12) { center = vec2(-0.743643887037151, 0.131825904205330); zoom = 12500.0; }
    else if (idx == 13) { center = vec2(-0.743643887037151, 0.131825904205330); zoom = 6250.0; }
    else if (idx == 14) { center = vec2(-0.743643887037151, 0.131825904205330); zoom = 1562.5; }
    else if (idx == 15) { center = vec2(-0.743643887037151, 0.131825904205330); zoom = 781.25; }
    else if (idx == 16) { center = vec2(-0.743643887037151, 0.131825904205330); zoom = 390.625; }
    else if (idx == 17) { center = vec2(-0.743643887037151, 0.131825904205330); zoom = 195.3125; }
    else if (idx == 18) { center = vec2(-0.743643887037151, 0.131825904205330); zoom = 97.65625; }
    else if (idx == 19) { center = vec2(-0.743643887037151, 0.131825904205330); zoom = 48.828125; }
    else if (idx == 20) { center = vec2(-0.743643887037151, 0.131825904205330); zoom = 24.4140625; }
    else if (idx == 21) { center = vec2(-0.743643887037151, 0.131825904205330); zoom = 12.20703125; }
    else if (idx == 22) { center = vec2(-0.743643887037151, 0.131825904205330); zoom = 6.103515625; }
    else { center = vec2(-0.75, 0.0); zoom = 1.0; }
}

void main() {
    int idx = int(mod(floor(iTime / 5.0), 22.0));
    // int idx = 2;
    vec2 center;
    float zoom;
    getPair(idx, center, zoom);

    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    uv = uv * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    vec2 c = uv * (3.0 / zoom) + center;

    vec2 z = vec2(0.0);
    int maxIter = 200;
    int i;
    for (i = 0; i < maxIter; i++) {
        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
        if (dot(z, z) > 4.0) break;
    }

    float norm = max(dot(z, z), 1e-8);
    float t = float(i) - log2(log2(norm)) + 4.0;
    t = t / float(maxIter);

    vec3 col = palette(t);

    fragColor = vec4(col, 1.0);
}