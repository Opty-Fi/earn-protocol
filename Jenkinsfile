pipeline {
    agent any
  
    stages {
        stage('lint') {
            steps {
              nodejs("Node-12.22.1"){
                sh 'yarn install --frozen-lockfile'
                sh 'yarn lint'
              }
            }
        }
        stage('Compile') {
            steps {
                nodejs("Node-12.22.1"){
                sh 'yarn install --frozen-lockfile'
                sh 'yarn compile'
              }
            }
        }
        stage('Test') {
            steps {
                nodejs("Node-12.22.1"){
                sh 'yarn install --frozen-lockfile'
                sh 'export NODE_OPTIONS="--max-old-space-size=8192"'
                sh 'yarn test-fast'
              }
            }
        }
    }
}
