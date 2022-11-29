let AWS = require( 'aws-sdk' );
let EC2 = new AWS.EC2();
let ImageId = process.env.ImageId;

module.exports = class TSGCloneCreatorService {
  constructor ( emitter ) {
    this._emitter = emitter;
    this._emitter.on( 'create-clone', ( event ) => { this.createClone( event ); } );
  }

  createClone( event ) {
    let DBCloneParams = {
      ImageId: ImageId,
      InstanceType: event[ "instance-type" ],
      KeyName: "TSGCloneKeyPair",
      MaxCount: 1, 
      MinCount: 1,
      TagSpecifications: [
        {
          ResourceType: "instance", 
          Tags: [
              {
                Key: "type", 
                Value: "tsg-clone"
              }
          ]
        }
      ]
    };

    let FileCloneParams = {
      ImageId: ImageId,
      InstanceType: event[ "instance-type" ],
      KeyName: "TSGCloneKeyPair",
      MaxCount: 1, 
      MinCount: 1,
      TagSpecifications: [
        {
          ResourceType: "instance", 
          Tags: [
              {
                Key: "type", 
                Value: "tsg-clone"
              }
          ]
        }
      ]
    };

    DBCloneParams.TagSpecifications[ 0 ].Tags.push(
      { 
        "Key": "Name", 
        "Value": ( "Clone_TSG_" + event[ "clone-name" ] + "_DBServer" ) 
      } 
    );

    FileCloneParams.TagSpecifications[ 0 ].Tags.push(
      { 
        "Key": "Name", 
        "Value": ( "Clone_TSG_" + event[ "clone-name" ] + "_FileServer" ) 
      } 
    );

    EC2.runInstances(
      DBCloneParams,
      async ( err1, data1 ) => {
        if ( err1 ) {
          this._emitter.emit( 'log', err1, 'clone-db-error', 500 );
          this._emitter.emit( 'clone-db-error', err1 );
          return;
        }


      
        EC2.runInstances(
          FileCloneParams,
          async ( err2, data2 ) => {
            if ( err2 ) {
              this._emitter.emit( 'log', err2, 'clone-file-error', 500 );
              this._emitter.emit( 'clone-file-error', err2 );
              return;
            }
            data1.FileClone = Object.assign( {}, data2 );
            data2.DBClone = Object.assign( {}, data1 );
            data2[ 'clone-name' ] = event[ 'clone-name' ];
            this._emitter.emit( 'connect-file-clone', data2 );
            this._emitter.emit( 'connect-db-clone', data1 );
          }
        );

      }
    );
  }
}
