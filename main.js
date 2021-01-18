var express = require('express');
var app = express();
let AWS = require('aws-sdk');
let fs = require('fs');
let credential = {
  accessKeyId: 'AKIAIRHEWHIADE36CVTQ',
  secretAccessKey: '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',
  region: 'ap-south-1',
  bucketname: 'abcssbackup'
};
let Db = require('mongodb').Db;
let MongoClient = require('mongodb').MongoClient;
let onlineUrl = "mongodb://root:bFP9AZAHWWCT@127.0.0.1:29782/ABC-dev?connectTimeoutMS=10000&authSource=admin&authMechanism=SCRAM-SHA-1&3t.uriVersion=3&3t.connection.name=Cluster1-shard-0&3t.ssh=true&3t.sshAddress=ec2-13-233-16-167.ap-south-1.compute.amazonaws.com&3t.sshPort=22&3t.sshAuthMode=privateKey&3t.sshUser=bitnami&3t.sshPKPath=C:/Users/DELL/Downloads/abcss-dev.pem&3t.sshUsePKPassphrase=false&3t.databases=admin";
let offlineUrl = "mongodb://localhost:27017/abc_local";

app.get('/', function (req, res) {
  res.send('Hello World');
})


// This responds with "Hello World" on the homepage
app.get('/dumpData', async function (req, res) {

  let result = await new Promise((resolve, reject) => {

    AWS.config.update(credential);
    let s3 = new AWS.S3({
      params: {
        Bucket: credential.bucketname
      }
    });
    let date = new Date();
    let day = ("0" + date.getDate()).slice(-2).toString(),
      month = ("0" + (date.getMonth() + 1)).slice(-2).toString(),
      year = date.getFullYear().toString();
    let fileName = day + month + year + '.gz';

    if (offlineUrl) {
      const cron = require('node-cron');
      const childProcess = require('child_process');
      const spawn = childProcess.spawn;
      let backupProcess = spawn('mongodump', [
        '--uri="' + offlineUrl + '"',
        '--archive=./backup-data/' + fileName,
        '--gzip'
      ]).on('error', function (err) {
        console.log(err);
        resolve({
          message: 'Error',
        });

      });

      backupProcess.on('exit', (code, signal) => {
        if (code) {
          console.log('Backup process exited with code ', code);
          resolve({ message: 'Backup process exited with code ' })
        }
        else if (signal) {
          console.log('Backup process was killed with signal ', signal);
          resolve({ message: 'Backup process was killed with signal ' })
        }
        else {
          fs.readFile('./backup-data/' + fileName, function (error, result) {
            if (result) {
              let params = {
                Key: fileName,
                Body: result,
                ACL: 'public-read'
              }
              s3.upload(params, function (err, data) {
                if (!err) {
                  fs.unlink('./' + fileName, function (err, res) {
                    s3.getSignedUrl('getObject', {
                      Key: params.Key,
                      Expires: 1200
                    }, function (err, data) {
                      console.log('Backup complete , you can download it from here - ', data)
                      try {
                       // fs.unlinkSync('./backup-data/' + fileName);
                        console.log('successfully deleted ' + fileName);

                      } catch (err) {
                        console.log(err);
                        console.log('unable to delete ' + fileName);
                      }
                      resolve({
                        message: 'Successfully backedup the database',
                        backupData: data
                      });
                    });

                  })
                } else {
                  resolve({ message: "Error occured,while uploading to AWS" })

                }
              });
            } else {
              console.log(error)
              resolve({ message: "Error occured,while uploading to AWS" })
            }
          })
        }
      });
    }
  });
  res.send(result);
})

// This responds a GET request for the /list_user page.
app.get('/restoreData', async function (req, res) {
  restored = await new Promise((resolve, reject) => {
	  console.log(114)
    AWS.config.update(credential);
    var s3 = new AWS.S3({ apiVersion: '2006-03-01' });
    let date = new Date();
    let day = ("0" + date.getDate()).slice(-2).toString(),
      month = ("0" + (date.getMonth() + 1)).slice(-2).toString(),
      year = date.getFullYear().toString();

    let fileName = day + month + year + '.gz';

    var fileStream = fs.createWriteStream('./backup-data/' + fileName);
    var s3Stream = s3.getObject({ Bucket: credential.bucketname, Key: fileName }).createReadStream();

    // Listen for errors returned by the service
    s3Stream.on('error', function (err) {
      // NoSuchKey: The specified key does not exist
      console.error(err);
    });

    s3Stream.pipe(fileStream).on('error', function (err) {
      // capture any errors that occur when writing data to the file
      console.error('File Stream:', err);
      resolve({ message: 'File Stream:' + err })
    }).on('close', function () {
      console.log('Done.');
      if (onlineUrl) {
        const cron = require('node-cron');
        const childProcess = require('child_process');
        const spawn = childProcess.spawn;
	console.log(143)
        let restoreProcess = spawn('mongorestore', [
          '--uri=' + onlineUrl,
          '--gzip',
          '--archive=./backup-data/' + fileName,
          '--drop',
          '--nsFrom=abc_local.*',
          '--nsTo=ABC-dev.*'
        ]);
	console.log(153)
        restoreProcess.on('exit', (code, signal) => {
			console.log(154)
          if (code) {
            console.log('restore process exited with code ', code);
            resolve({ message: 'Backup process exited with code ' })
          }
          else if (signal) {
            console.log('restore process was killed with signal ', signal);
            resolve({ message: 'Backup process was killed with signal ' })
          } else {
            try {
              fs.unlinkSync('./backup-data/' + fileName);
              console.log('successfully deleted ' + fileName);

            } catch (err) {
              console.log(err);
              console.log('unable to delete ' + fileName);
            }
            resolve({
              message: 'Successfully restored to the database',
              backupData: "Done"
            })
          }
        });
      }
    });
  });

  res.send(restored);
})

async function restoreData() {
  restored = await new Promise((resolve, reject) => {
    let urL = "mongodb+srv://backup:CM%40h250194@cluster0.i80ep.mongodb.net/test?authSource=admin&replicaSet=atlas-k1shu9-shard-0&readPreference=primary&appname=MongoDB%20Compass%20Isolated%20Edition&ssl=true";
    AWS.config.update(credential);
    var s3 = new AWS.S3({ apiVersion: '2006-03-01' });
    let date = new Date();
    let day = ("0" + date.getDate()).slice(-2).toString(),
      month = ("0" + (date.getMonth() + 1)).slice(-2).toString(),
      year = date.getFullYear().toString();

    let fileName = day + month + year + '.gz';

    var fileStream = fs.createWriteStream('./backup-data/' + fileName);
    var s3Stream = s3.getObject({ Bucket: credential.bucketname, Key: fileName }).createReadStream();

    // Listen for errors returned by the service
    s3Stream.on('error', function (err) {
      // NoSuchKey: The specified key does not exist
      console.error(err);
    });

    s3Stream.pipe(fileStream).on('error', function (err) {
      // capture any errors that occur when writing data to the file
      console.error('File Stream:', err);
      resolve({ message: 'File Stream:' + err })
    }).on('close', function () {
      console.log('Done.');
      if (urL) {
        const cron = require('node-cron');
        const childProcess = require('child_process');
        const spawn = childProcess.spawn;

        let restoreProcess = spawn('mongorestore', [
          '--uri=' + urL,
          '--gzip',
          '--archive=./backup-data/' + fileName,
          '--drop',
          '--nsFrom="<dbname>.*"',
          '--nsTo="backup-data.*"'
        ]);

        restoreProcess.on('exit', (code, signal) => {
          if (code) {
            console.log('restore process exited with code ', code);
            resolve({ message: 'Backup process exited with code ' })
          }
          else if (signal) {
            console.log('restore process was killed with signal ', signal);
            resolve({ message: 'Backup process was killed with signal ' })
          } else {
            try {
              fs.unlinkSync('./backup-data/' + fileName);
              console.log('successfully deleted ' + fileName);

            } catch (err) {
              console.log(err);
              console.log('unable to delete ' + fileName);
            }
            resolve({
              message: 'Successfully restored to the database',
              backupData: "Done"
            })
          }
        });
      }
    });
  });
}

async function backupData() {
  let result = await new Promise((resolve, reject) => {

    AWS.config.update(credential);
    let s3 = new AWS.S3({
      params: {
        Bucket: credential.bucketname
      }
    });

    let urL = "mongodb://jamba:!2cQaK79.7CUQk@cluster0-shard-00-00.q2olu.mongodb.net:27017,cluster0-shard-00-01.q2olu.mongodb.net:27017,cluster0-shard-00-02.q2olu.mongodb.net:27017/<dbname>?authSource=admin&replicaSet=atlas-t6ajrt-shard-0&w=majority&readPreference=primary&appname=MongoDB%20Compass%20Community&retryWrites=true&ssl=true";


    let date = new Date();
    let day = ("0" + date.getDate()).slice(-2).toString(),
      month = ("0" + (date.getMonth() + 1)).slice(-2).toString(),
      year = date.getFullYear().toString();
    let fileName = day + month + year + '.gz';

    if (urL) {
      const cron = require('node-cron');
      const childProcess = require('child_process');
      const spawn = childProcess.spawn;
      let backupProcess = spawn('mongodump', [
        '--uri="' + urL + '"',
        '--archive=./backup-data/' + fileName,
        '--gzip'
      ]).on('error', function (err) {
        console.log(err);
        resolve({
          message: 'Error',
        });

      });

      backupProcess.on('exit', (code, signal) => {
        if (code) {
          console.log('Backup process exited with code ', code);
          resolve({ message: 'Backup process exited with code ' })
        }
        else if (signal) {
          console.log('Backup process was killed with signal ', signal);
          resolve({ message: 'Backup process was killed with signal ' })
        }
        else {
          fs.readFile('./backup-data/' + fileName, function (error, result) {
            if (result) {
              let params = {
                Key: fileName,
                Body: result,
                ACL: 'public-read'
              }
              s3.upload(params, function (err, data) {
                if (!err) {
                  fs.unlink('./' + fileName, function (err, res) {
                    s3.getSignedUrl('getObject', {
                      Key: params.Key,
                      Expires: 1200
                    }, function (err, data) {
                      console.log('Backup complete , you can download it from here - ', data)
                      try {
                        fs.unlinkSync('./backup-data/' + fileName);
                        console.log('successfully deleted ' + fileName);

                      } catch (err) {
                        console.log(err);
                        console.log('unable to delete ' + fileName);
                      }
                      resolve({
                        message: 'Successfully backedup the database',
                        backupData: data
                      });
                    });

                  })
                } else {
                  resolve({ message: "Error occured,while uploading to AWS" })

                }
              });
            } else {
              console.log(error)
              resolve({ message: "Error occured,while uploading to AWS" })
            }
          })
        }
      });
    }
  });
}

// This responds a GET request for abcd, abxcd, ab123cd, and so on
app.get('/ab*cd', function (req, res) {
  console.log("Got a GET request for /ab*cd");
  res.send('Page Pattern Match');
})

var server = app.listen(8081, () => {
  var host = server.address().address;
  var port = server.address().port;

  console.log("Example app listening at http://%s:%s", host, port)
})