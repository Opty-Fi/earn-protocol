pipeline {
    agent any
  
    stages {
        stage('lint') {
            steps {
                sh 'yarn install'
                sh 'yarn lint'
            }
        }
        stage('Test') {
            steps {
                echo 'Testing..'
            }
        }
        stage('Deploy') {
            steps {
                echo 'Deploying....'
            }
        }
    }
}
