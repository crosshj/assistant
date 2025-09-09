#define GL_SILENCE_DEPRECATION
#include <OpenGL/gl3.h>
#include <GLFW/glfw3.h>
#include <sys/stat.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static const char *VS =
"#version 150 core\n"
"in vec2 p;void main(){gl_Position=vec4(p,0,1);}";

static char* read_file(const char* path){
    FILE* f=fopen(path,"rb"); if(!f) return NULL;
    fseek(f,0,SEEK_END); long n=ftell(f); fseek(f,0,SEEK_SET);
    char* s=(char*)malloc((size_t)n+1);
    if(!s) return NULL;
    fread(s,1,(size_t)n,f); s[n]=0; fclose(f);
    return s;
}

static GLuint mkshader_src(const char* src, GLenum type){
    GLuint s=glCreateShader(type);
    glShaderSource(s,1,&src,NULL);
    glCompileShader(s);
    GLint ok=0; glGetShaderiv(s,GL_COMPILE_STATUS,&ok);
    if(!ok){
        char log[1024];
        glGetShaderInfoLog(s,1024,NULL,log);
        fprintf(stderr,"%s\n",log);
    }
    return s;
}

static GLuint mkprog_fs(const char* fs_src){
    GLuint p=glCreateProgram();
    GLuint vs=mkshader_src(VS,GL_VERTEX_SHADER);
    GLuint fs=mkshader_src(fs_src,GL_FRAGMENT_SHADER);
    glAttachShader(p,vs); glAttachShader(p,fs);
    glBindAttribLocation(p,0,"p");
    glLinkProgram(p);
    GLint ok=0; glGetProgramiv(p,GL_LINK_STATUS,&ok);
    if(!ok){
        char log[1024];
        glGetProgramInfoLog(p,1024,NULL,log);
        fprintf(stderr,"%s\n",log);
    }
    glDeleteShader(vs);
    glDeleteShader(fs);
    return p;
}

static int reload=0;
static void keycb(GLFWwindow* w,int key,int sc,int action,int mods){
    (void)sc; (void)mods; // silence unused parameter warnings
    if(action==GLFW_PRESS && (key=='R'||key==GLFW_KEY_F5)) reload=1;
    if(action==GLFW_PRESS && key==GLFW_KEY_ESCAPE) glfwSetWindowShouldClose(w,1);
}

int main(int argc,char**argv){
    const char* fragPath = (argc>1? argv[1] : "sdf.frag.c");
    if(!glfwInit()) return 1;
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR,3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR,2);
    glfwWindowHint(GLFW_OPENGL_PROFILE,GLFW_OPENGL_CORE_PROFILE);
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT,GL_TRUE);
    GLFWwindow* w = glfwCreateWindow(800,450,"toy",NULL,NULL);
    if(!w) return 1;
    glfwMakeContextCurrent(w);
    glfwSetKeyCallback(w,keycb);

    // fullscreen triangle
    GLuint vao,vbo;
    glGenVertexArrays(1,&vao); glBindVertexArray(vao);
    glGenBuffers(1,&vbo); glBindBuffer(GL_ARRAY_BUFFER,vbo);
    float verts[]={-1,-1, 3,-1, -1,3};
    glBufferData(GL_ARRAY_BUFFER,sizeof(verts),verts,GL_STATIC_DRAW);
    glEnableVertexAttribArray(0);
    glVertexAttribPointer(0,2,GL_FLOAT,GL_FALSE,0,(void*)0);

    // load shader
    time_t last_mtime=0;
    struct stat st;
    char* fs_src=read_file(fragPath);
    if(!fs_src){ fprintf(stderr,"no %s\n",fragPath); return 1; }
    GLuint prog=mkprog_fs(fs_src);
    free(fs_src);
    stat(fragPath,&st);
    last_mtime=st.st_mtime;
    GLint uRes=glGetUniformLocation(prog,"iResolution");
    GLint uTime=glGetUniformLocation(prog,"iTime");
    GLint uMouse=glGetUniformLocation(prog,"iMouse");

    double t0=glfwGetTime();
    double downX=0,downY=0; int mouseDown=0;
    while(!glfwWindowShouldClose(w)){
        // auto-reload on file change
        if(!stat(fragPath,&st) && st.st_mtime!=last_mtime){
            last_mtime=st.st_mtime;
            char* s=read_file(fragPath);
            GLuint np=mkprog_fs(s); free(s);
            GLint ok=0; glGetProgramiv(np,GL_LINK_STATUS,&ok);
            if(ok){
                glDeleteProgram(prog); prog=np;
                uRes=glGetUniformLocation(prog,"iResolution");
                uTime=glGetUniformLocation(prog,"iTime");
                uMouse=glGetUniformLocation(prog,"iMouse");
            } else glDeleteProgram(np);
        }
        if(reload){
            reload=0;
            char* s=read_file(fragPath);
            GLuint np=mkprog_fs(s); free(s);
            GLint ok=0; glGetProgramiv(np,GL_LINK_STATUS,&ok);
            if(ok){
                glDeleteProgram(prog); prog=np;
                uRes=glGetUniformLocation(prog,"iResolution");
                uTime=glGetUniformLocation(prog,"iTime");
                uMouse=glGetUniformLocation(prog,"iMouse");
            } else glDeleteProgram(np);
        }

        int ww,hh;
        glfwGetFramebufferSize(w,&ww,&hh);
        glViewport(0,0,ww,hh);
        glClear(GL_COLOR_BUFFER_BIT);
        glUseProgram(prog);
        float res[3]={ (float)ww,(float)hh, 1.0f };
        glUniform3fv(uRes,1,res);
        float time=(float)(glfwGetTime()-t0);
        glUniform1f(uTime,time);

        // mouse
        double mx,my;
        glfwGetCursorPos(w,&mx,&my);
        int pressed=glfwGetMouseButton(w,GLFW_MOUSE_BUTTON_LEFT)==GLFW_PRESS;
        if(pressed && !mouseDown){ mouseDown=1; downX=mx; downY=hh-my; }
        if(!pressed) mouseDown=0;
        float m[4]={(float)mx,(float)(hh-my), pressed?(float)downX:0.f, pressed?(float)downY:0.f};
        glUniform4fv(uMouse,1,m);

        glDrawArrays(GL_TRIANGLES,0,3);
        glfwSwapBuffers(w);
        glfwPollEvents();
    }
    glfwTerminate();
    return 0;
}
