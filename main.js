var express = require('express');
var app = express();
let AWS = require('aws-sdk');
let fs = require('fs');
const { compileFunction } = require('vm');
let credential = {
  accessKeyId: 'AKIAIRHEWHIADE36CVTQ',
  secretAccessKey: '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',
  region: 'ap-south-1',
  bucketname: 'abcssbackup'
};


// app.get('/uploadData', async function (req, res) {
async function mongoUpload(){
  let result = await new Promise((resolve, reject) => {
    'use strict';
    /**
     * @file collection example
     * @module mongodb-backup
     * @subpackage examples
     * @version 0.0.1
     */

    /*
     * initialize module
     */

    AWS.config.update(credential);
    let s3 = new AWS.S3({
      params: {
        Bucket: credential.bucketname
      }
    });

    let offlineUrL = "mongodb://localhost:27017/abc_local";
    // let onlineUrL = "mongodb://root:bFP9AZAHWWCT@ec2-13-233-16-167.ap-south-1.compute.amazonaws.com:27017/ABC-dev?authSource=admin&connectTimeoutMS=10000&readPreference=primary&authMechanism=SCRAM-SHA-1&appname=MongoDB%20Compass&ssl=false"
    let onlineUrL = "mongodb://root:bFP9AZAHWWCT@65.0.35.119:27017/ABC-dev?authSource=admin&connectTimeoutMS=10000&readPreference=primary&authMechanism=SCRAM-SHA-1&appname=MongoDB%20Compass&ssl=false"
    let date = new Date();
    let day = ("0" + date.getDate()).slice(-2).toString(),
      month = ("0" + (date.getMonth() + 1)).slice(-2).toString(),
      year = date.getFullYear().toString();

    let fileName = day + month + year + '.gz';

    if (offlineUrL) {
      const childProcess = require('child_process');
      const spawn = childProcess.spawn;
      let backupProcess = spawn('mongodump', [
        '--uri="' + offlineUrL + '"',
        '--archive=./backup-data/' + fileName,
        '--gzip'
      ]).on('error', function (err) {
        console.log('(Dump) err:'+err);
        resolve({
          message: 'Error',
        });

      });

      backupProcess.on('exit', (code, signal) => {
        if (code) {
          console.log('Dump process exited with code ', code);
          resolve({ message: 'Dump process exited with code: '+ code })
        }
        else if (signal) {
          console.log('Dump process was killed with signal ', signal);
          resolve({ message: 'Dump process was killed with signal: '+ signal })
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
                      console.log('Dump complete , you can download it from here - ', data)
                      try {
                        fs.unlinkSync('./backup-data/' + fileName);
                        console.log('(Dump)successfully deleted ' + fileName);

                      } catch (err) {
                        console.log(err);
                        console.log('(Dump)unable to delete ' + fileName);
                      }
                      console.log('Successfully dumped the database & start restoring..');
                      //restoring starts

                      var restore_s3 = new AWS.S3({ apiVersion: '2006-03-01' });
                      var fileStream = fs.createWriteStream('./backup-data/' + fileName);
                      var s3Stream = restore_s3.getObject({ Bucket: credential.bucketname, Key: fileName }).createReadStream();

                      // Listen for errors returned by the service
                      s3Stream.on('error', function (err) {
                        // NoSuchKey: The specified key does not exist
                        console.error('(Restore) error:'+err);
                      });

                      s3Stream.pipe(fileStream).on('error', function (err) {
                        // capture any errors that occur when writing data to the file
                        console.error('(Restore)File Stream:', err);
                        resolve({ message: 'File Stream:' + err })
                      }).on('close', function () {
                        if (onlineUrL) {
                          const childProcess = require('child_process');
                          const spawn = childProcess.spawn;

                          let restoreProcess = spawn('mongorestore', [
                            '--uri=' + onlineUrL,
                            '--gzip',
                            '--archive=./backup-data/' + fileName,
                            '--drop',
                            '--nsFrom="abc_local.*"',
                            '--nsTo="ABC-dev.*"'
                          ]).on('error', function (err) {
                            console.log('(Restore) err:'+err);
                            resolve({
                              message: 'Error',
                            });
                          });

                          restoreProcess.on('exit', (code, signal) => {
                            if (code) {
                              console.log('restore process exited with code ', code);
                              resolve({ message: 'Restore process exited with code :'+code })
                            }
                            else if (signal) {
                              console.log('restore process was killed with signal ', signal);
                              resolve({ message: 'Restore process was killed with signal :'+signal })
                            } else {
                              try {
                                fs.unlinkSync('./backup-data/' + fileName);
                                console.log('(Restore)successfully deleted ' + fileName);

                              } catch (err) {
                                console.log(err);
                                console.log('(Restore)unable to delete ' + fileName);
                              }
                              console.log('restore completed');
                              resolve({
                                message: 'Successfully uploaded to the database',
                                backupData: "Done"
                              })
                            }
                          });
                        }
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
return result;
}
//   res.send(result);
// })

// This responds a GET request for the /list_user page.
// app.get('/restoreData', async function (req, res) {
  //   restored=await  new Promise((resolve, reject) => {
  //     'use strict';
  //     /**
  //      * @file collection example
  //      * @module mongodb-backup
  //      * @subpackage examples
  //      * @version 0.0.1
  //      */

  //     /*
  //      * initialize module
  //      */
  // let urL="mongodb://root:bFP9AZAHWWCT@ec2-13-233-16-167.ap-south-1.compute.amazonaws.com:27017/ABC-dev?authSource=admin&connectTimeoutMS=10000&readPreference=primary&authMechanism=SCRAM-SHA-1&appname=MongoDB%20Compass&ssl=false"
  // AWS.config.update(credential);
  // var s3 = new AWS.S3({apiVersion: '2006-03-01'});
  // let date = new Date();
  // let day = ("0" + date.getDate()).slice(-2).toString(),
  //   month = ("0" + (date.getMonth() + 1)).slice(-2).toString(),
  //   year = date.getFullYear().toString();

  // let fileName = day + month + year + '.gz';


  // var fileStream = fs.createWriteStream('./backup-data/'+fileName );
  // var s3Stream = s3.getObject({Bucket: credential.bucketname, Key: fileName}).createReadStream();

  // // Listen for errors returned by the service
  // s3Stream.on('error', function(err) {
  //     // NoSuchKey: The specified key does not exist
  //     console.error(err);
  // });

  // s3Stream.pipe(fileStream).on('error', function(err) {
  //     // capture any errors that occur when writing data to the file
  //     console.error('File Stream:', err);
  //     resolve({ message: 'File Stream:'+ err })
  // }).on('close', function() {
  //     console.log('Done.');
  //     if (urL) {
  //       const cron = require('node-cron');
  //       const childProcess = require('child_process');
  //       const spawn = childProcess.spawn;

  //       let restoreProcess = spawn('mongorestore', [
  //         '--uri=' + urL,
  //         '--gzip',
  //         '--archive=./backup-data/' + fileName,
  //         '--drop',
  //         '--nsFrom="ABC-dev.*"',
  //         '--nsTo="backup-data.*"'
  //       ]);

  //       restoreProcess.on('exit', (code, signal) => {
  //         if (code) {
  //           console.log('restore process exited with code ', code);
  //           resolve({ message: 'Backup process exited with code ' })
  //         }
  //         else if (signal) {
  //           console.log('restore process was killed with signal ', signal);
  //           resolve({ message: 'Backup process was killed with signal ' })
  //         } else {
  //           try {
  //             fs.unlinkSync('./backup-data/' + fileName);
  //             console.log('successfully deleted '+ fileName);

  //           } catch (err) {
  //               console.log(err);
  //             console.log('unable to delete '+ fileName);
  //           }
  //           resolve({
  //             message: 'Successfully restored to the database',
  //             backupData: "Done"
  //           })
  //         }
  //       });
  //     }
  // });
  // });

//   res.send(restored);
// })

var server = app.listen(8081, function () {
  var host = server.address().address
  var port = server.address().port

  const cron = require('node-cron');
  let dbBackupTask = cron.schedule('*/2 * * * *', () => {
  console.log('running a task every two minutes');
  mongoUpload();
})
  console.log("Example app listening at http://%s:%s", host, port)
})