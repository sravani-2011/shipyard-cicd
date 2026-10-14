// CI/CD: GitHub -> Jenkins -> Docker Hub -> Kubernetes (k3s on EC2)
//
// Prerequisites on the Jenkins host (handled by infra/ec2-bootstrap.sh):
//   - docker installed, jenkins user in the docker group
//   - kubectl + kubeconfig at /var/lib/jenkins/.kube/config
// Prerequisites in Jenkins:
//   - Credential "dockerhub-creds" (Username with password / access token)

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '15'))
        timeout(time: 30, unit: 'MINUTES')
    }

    triggers {
        // Fallback if no GitHub webhook is configured: poll every 2 minutes
        pollSCM('H/2 * * * *')
    }

    environment {
        APP_NAME   = 'shipyard'
        K8S_NS     = 'shipyard'
        NODE_PORT  = '30080'
        DOCKER_HUB = credentials('dockerhub-creds')   // exposes DOCKER_HUB_USR / DOCKER_HUB_PSW
        KUBECONFIG = '/var/lib/jenkins/.kube/config'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_SHORT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    env.IMAGE     = "${env.DOCKER_HUB_USR}/${env.APP_NAME}"
                    env.IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_SHORT}"
                    currentBuild.displayName = "#${env.BUILD_NUMBER} (${env.GIT_SHORT})"
                }
                echo "Building ${env.IMAGE}:${env.IMAGE_TAG}"
            }
        }

        stage('Install & Test') {
            steps {
                // Run tests in a throwaway Node container so the Jenkins host needs no Node.js
                sh '''
                    docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp \
                      -v "$WORKSPACE/app":/app -w /app node:20-alpine \
                      sh -c "npm install --no-audit --no-fund && npm test"
                '''
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                    docker build \
                      --build-arg APP_VERSION="$IMAGE_TAG" \
                      --build-arg BUILD_NUMBER="$BUILD_NUMBER" \
                      --build-arg GIT_COMMIT="$GIT_SHORT" \
                      -t "$IMAGE:$IMAGE_TAG" -t "$IMAGE:latest" .
                '''
            }
        }

        stage('Push Image') {
            steps {
                sh '''
                    echo "$DOCKER_HUB_PSW" | docker login -u "$DOCKER_HUB_USR" --password-stdin
                    docker push "$IMAGE:$IMAGE_TAG"
                    docker push "$IMAGE:latest"
                '''
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh '''
                    kubectl apply -f k8s/namespace.yaml
                    kubectl apply -f k8s/service.yaml
                    sed -e "s|IMAGE_PLACEHOLDER|$IMAGE:$IMAGE_TAG|g" \
                        -e "s|BUILD_PLACEHOLDER|$BUILD_NUMBER|g" \
                        k8s/deployment.yaml | kubectl apply -f -
                '''
            }
        }

        stage('Verify Rollout') {
            steps {
                script {
                    try {
                        sh 'kubectl -n "$K8S_NS" rollout status deployment/"$APP_NAME" --timeout=180s'
                    } catch (err) {
                        echo 'Rollout failed - rolling back to previous version'
                        sh 'kubectl -n "$K8S_NS" rollout undo deployment/"$APP_NAME" || true'
                        throw err
                    }
                }
                sh 'kubectl -n "$K8S_NS" get pods -o wide'
            }
        }

        stage('Smoke Test') {
            steps {
                sh '''
                    for i in $(seq 1 10); do
                      curl -fsS "http://localhost:$NODE_PORT/healthz" && break
                      sleep 3
                    done
                    curl -fsS "http://localhost:$NODE_PORT/api/info" | tee /dev/stderr | grep -q "\\"buildNumber\\":\\"$BUILD_NUMBER\\""
                '''
            }
        }
    }

    post {
        success {
            echo "Deployed ${env.IMAGE}:${env.IMAGE_TAG} -> http://<EC2_PUBLIC_IP>:${env.NODE_PORT}"
        }
        always {
            sh 'docker logout || true'
            // Free disk space on the build host; keep the image just deployed
            sh 'docker image prune -f || true'
        }
    }
}
