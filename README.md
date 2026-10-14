# Shipyard — CI/CD Pipeline to Deploy a Dockerized App on Kubernetes using Jenkins

A multi-page Node.js/Express website (Home, Pipeline, Architecture, Live Status, Contact) that is
**tested → containerized → pushed to Docker Hub → deployed to Kubernetes (k3s) → verified** by a Jenkins
declarative pipeline running on AWS EC2.

```
Developer ──git push──▶ GitHub ──▶ Jenkins (EC2:8080)
                                     ├─ Install & Test (node:20 container)
                                     ├─ Docker Build  (<user>/shipyard:<build>-<sha>)
                                     ├─ Push          (Docker Hub)
                                     ├─ Deploy        (kubectl apply → k3s)
                                     ├─ Verify        (rollout status / auto-rollback)
                                     └─ Smoke Test    (curl :30080)
Users ──▶ http://<EC2_IP>:30080 ──▶ Service (NodePort) ──▶ 3 Pods
```

## Repository layout
| Path | Purpose |
|---|---|
| `app/` | Express server, static website, tests (`npm test`) |
| `Dockerfile` | Multi-stage, non-root production image |
| `Jenkinsfile` | 7-stage declarative pipeline |
| `k8s/` | Namespace, Deployment (3 replicas, probes, limits), NodePort Service |
| `infra/ec2-bootstrap.sh` | EC2 user-data: Docker, Jenkins LTS, Java 21, k3s, kubeconfig for Jenkins |

## 1. AWS EC2
* AMI: Ubuntu Server 24.04 LTS · Type: **t3.medium** · Disk: **25 GB gp3**
* Security group inbound: 22 (SSH, your IP), 8080 (Jenkins), 30080 (app)
* Advanced details → User data: paste `infra/ec2-bootstrap.sh`
* Wait ~5–7 min. Check with `sudo tail -f /var/log/bootstrap.log` (done when `/var/log/bootstrap.done` exists).

## 2. Push this code to GitHub
```bash
git init && git add . && git commit -m "Shipyard CI/CD"
git branch -M main
git remote add origin https://github.com/<you>/shipyard-cicd.git
git push -u origin main
```

## 3. Jenkins setup (http://<EC2_IP>:8080)
1. Unlock: `sudo cat /var/lib/jenkins/secrets/initialAdminPassword` (EC2 → Connect → EC2 Instance Connect).
2. Install suggested plugins, create your admin user.
3. **Manage Jenkins → Credentials → System → Global → Add**
   * Kind: Username with password · ID: `dockerhub-creds`
   * Username: your Docker Hub username · Password: a Docker Hub **access token**
4. **New Item → Pipeline** named `shipyard`
   * Pipeline → Definition: *Pipeline script from SCM* → Git → your repo URL → branch `*/main` → Script path `Jenkinsfile`
5. **Build Now**. (Afterwards it polls GitHub every 2 min; optionally add a GitHub webhook to `http://<EC2_IP>:8080/github-webhook/`.)

## 4. Verify
```bash
kubectl -n shipyard get deploy,pods,svc
```
Open `http://<EC2_IP>:30080` — the **Live Status** page shows the pod, build number and commit serving each request.

## Demo a release
Edit any text in `app/public/index.html`, commit and push. Jenkins builds `#N+1`, rolls it out with zero downtime,
and the footer/Live Status page shows the new build number.

## Cleanup
Terminate the EC2 instance (and its security group) when finished to stop charges / save lab credits.
