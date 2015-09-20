precision highp float;

#extension GL_OES_standard_derivatives : enable
#define M_PI 3.1415926535897932384626433832795

// Textures

uniform sampler2D uSamplerSand;
uniform sampler2D uSamplerSandNormal;

uniform sampler2D uSamplerSand2;
uniform sampler2D uSamplerSand2Normal;

uniform sampler2D uSamplerDirt;
uniform sampler2D uSamplerDirtNormal;

uniform sampler2D uSamplerRock;
uniform sampler2D uSamplerRockNormal;

uniform sampler2D uHeightMap;
uniform sampler2D uNoise;

uniform sampler2D uDepthMaps[4];

// map constantes

uniform float uMapSize;
uniform float uHeightScale;
uniform float uMode;
uniform float uUVScale;
uniform float uWaterLevel;

// Lighting uniforms

uniform vec3 uDirectionalColor;
uniform vec3 uAmbientColor;


// Varyings
varying vec4 vPositionLights[4];
varying vec3 vLightDir;
varying vec3 vEyeDirection;
varying vec3 vWorldPosition;
varying vec3 vVertexNormal;
varying vec4 vVertexPosition;

/**
*   Diffuse, normal bump mapping and specular lighting
*/
vec4 getTextureColor(vec4 diffuseColor, vec4 normal) {
    
    // convert normal map texture to normal vector
    vec3 vNormal = vec3( cos(normal.a * M_PI), 
                         sin(normal.a * M_PI) * sin(normal.g * M_PI), 
                         cos(normal.g * M_PI) );

    // diffuse lighting calculation
    float diffWeighting = max( dot(vLightDir, vNormal ), 0.0 );
    
    // specular lighting calculation
    vec3 reflectionDirection = reflect(-vLightDir, vNormal);

    float specWeighting = max( dot(vec3(0.0, 1.0, 0.0), reflectionDirection), 0.0 );
    vec3 specularColor = vec3(diffuseColor.a * specWeighting * diffWeighting * 2.0);
    
    vec4 color = vec4((diffuseColor.rgb * ((uDirectionalColor * diffWeighting) + uAmbientColor) /*+ specularColor*/), diffuseColor.a);

    //vec4 color = vec4((diffuseColor.rgb * ((uDirectionalColor * diffWeighting) + uAmbientColor) /*+ specularColor*/), 1.0);
    
    return color;
}

float linstep(float low, float high, float v){
    return clamp((v-low)/(high-low), 0.0, 1.0);
}

float VSM(sampler2D depths, vec2 uv, float compare){
    vec2 moments = texture2D(depths, uv).xy;
    float p = smoothstep(compare-0.02, compare, moments.x);
    float variance = max(moments.y - moments.x*moments.x, -0.001);
    float d = compare - moments.x;
    float p_max = linstep(0.2, 1.0, variance / (variance + d*d));
    return clamp(max(p, p_max), 0.0, 1.0);
}

void main() {
    
    if ( vWorldPosition.x < 0.0 || vWorldPosition.z < 0.0 || vWorldPosition.x > uMapSize || vWorldPosition.z > uMapSize) {
        discard;
    }

    vec2 uv = (vWorldPosition.xz / uMapSize) * uUVScale;
    
    // Sample textures
    
    vec4 textureSand2 = 	texture2D(uSamplerSand2, uv);
    vec4 textureSand2Normal =	texture2D(uSamplerSand2Normal, uv);
		
    vec4 textureDirt3 = 	texture2D(uSamplerDirt, uv);
    vec4 textureDirtNormal3 = 	texture2D(uSamplerDirtNormal, uv);
    
    vec4 sandColor = getTextureColor(textureSand2, textureSand2Normal);
    vec4 rockColor3 = getTextureColor(textureDirt3, textureDirtNormal3);
    
    float noise = (texture2D(uNoise, uv / 16.0).r * 2.0) - 1.0;
    
    vec4 yColor = rockColor3;
        
    float sandContrib;
    
    float yC = abs(dot(vVertexNormal, vec3(0.0, 1.0, 0.0)));
    sandContrib = smoothstep(0.7 + (yColor.a * 2.0) + (noise * 0.25), 1.0, yC);
    sandContrib = smoothstep(0.4, 0.6, sandContrib);
        
    vec4 colorFinal = sandColor * sandContrib + yColor * (1.0 - sandContrib);

    float shadow = 1.0;
    
    vec3 depths[4];
    depths[0] = vPositionLights[0].xyz / vPositionLights[0].w;
    depths[1] = vPositionLights[1].xyz / vPositionLights[1].w;
    depths[2] = vPositionLights[2].xyz / vPositionLights[2].w;
    depths[3] = vPositionLights[3].xyz / vPositionLights[3].w;

    //int index = depthMapIndex(length(vVertexPosition));
    
    float d = length(vVertexPosition);
    
    /*
      Variance Shadow map
    */
    
    float t = 0.0;
    
    float t1 = smoothstep(0.7, 1.0, 1.0 - vPositionLights[0].x);
    float t2 = smoothstep(0.7, 1.0, vPositionLights[0].x);    
    float t3 = smoothstep(0.7, 1.0, 1.0 - vPositionLights[0].y);
    float t4 = smoothstep(0.7, 1.0, vPositionLights[0].y);
    

    t = max(t1 + t2, t3 + t4);
    
    float tt = 0.0;
    
    float tt1 = smoothstep(0.7, 1.0, 1.0 - vPositionLights[1].x);
    float tt2 = smoothstep(0.7, 1.0, vPositionLights[1].x);    
    float tt3 = smoothstep(0.7, 1.0, 1.0 - vPositionLights[1].y);
    float tt4 = smoothstep(0.7, 1.0, vPositionLights[1].y);
    
    tt = max(tt1 + tt2, tt3 + tt4);
    
    float ttt = 0.0;
    
    float ttt1 = smoothstep(0.7, 1.0, 1.0 - vPositionLights[2].x);
    float ttt2 = smoothstep(0.7, 1.0, vPositionLights[2].x);    
    float ttt3 = smoothstep(0.7, 1.0, 1.0 - vPositionLights[2].y);
    float ttt4 = smoothstep(0.7, 1.0, vPositionLights[2].y);
    
    ttt = max(ttt1 + ttt2, ttt3 + ttt4);
    
    float c1 = 1.0 - t;
    float c2 = t - tt;
    float c3 = tt - ttt;
    float c4 = ttt;

    float shadow1 = VSM(uDepthMaps[0], depths[0].xy, depths[0].z);
    float shadow2 = VSM(uDepthMaps[1], depths[1].xy, depths[1].z);
    float shadow3 = VSM(uDepthMaps[2], depths[2].xy, depths[2].z);
    float shadow4 = VSM(uDepthMaps[3], depths[3].xy, depths[3].z);
    
    shadow = shadow1*c1 + shadow2*c2 + shadow3*c3 + shadow4*c4;
    
    gl_FragColor = vec4(vec3(colorFinal)*clamp(shadow, 0.7, 1.0), (gl_FragCoord.z / gl_FragCoord.w));
    //gl_FragColor = vec4(vec3(1.0, 0.0, 0.0)/**clamp(shadow, 0.7, 1.0)*/, (gl_FragCoord.z / gl_FragCoord.w));
    
}
