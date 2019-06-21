var express = require('express');
var router = express.Router();
var models = require('../models/index').models;
var passport = require('passport');
var webpush = require('web-push');
var utils  = require('./util');

router.get('/:id', (req, res) => {
    models.Group.findById(req.params.id, (err, group) => {
      if (err)
        res.send(err)
      else
        res.send(group);
    });
});

router.get('/create_group', (req, res) => {
  res.render('create_group.ejs');
});

// creates a group for the user
router.post('/create_group', (req, res) => {
  var traveler = {
    fb_id: req.body.fb_id,
    name: req.body.name,
    from: req.body.from,
    to: req.body.to,
    time: new Date(req.body.boardingTime),
  };
  var grp = models.Group({
    from: req.body.from,
    to: req.body.to,
    owner: traveler,
    departure: req.body.departure,
    status: 'open',
  });
  grp.save((err, object) => {
    if (err)
      res.send(500, err);
    else {
      models.User.findOneAndUpdate({fb_id: traveler.fb_id}, {$push: {created_groups: object}})
      .exec((err, obj) => {
        if (err) {
          res.send(500, err);
        }
        else {
          res.send(200, "OK");
        }
      }) ;
    }
  });
});

router.get('/remove_group', (req, res) => {
  res.render('remove_group.ejs');
});

router.post('/remove_group', (req, res) => {
  models.Group.findByIdAndDelete(req.body.groupId, (err, group) => {
    if (err) {
      res.send(err)
    }
    else {

      models.User.findOneAndUpdate({fb_id: group.owner.fb_id},
        {$pull: {'created_groups': group._id}})
      .exec((err, user) => {
        if (err)
          res.status(500).send(err);
        else {
          const message = {
            icon: '/images/' + group.owner.fb_id + '.jpg',
            type: 'remove_group',
            title: 'Group removed',
            body: group.owner.name + ' has removed the group',
          }
      
          const subject = {
            fb_id: group.owner.fb_id,
            name: group.owner.name,
          }

          var promiseArray = group.members.map(item => {
            utils.createNotification(message, subject, group)
            .then(notification =>
              models.User.findOneAndUpdate({fb_id: item.fb_id},
                { 
                  $push: {'notifications': notification},
                  $pull: {'joined_groups': group._id}
                })
                .exec())
            .then(user => utils.sendNotification(user.push_subscription, message));
          });
      
          Promise.all(promiseArray).then(values => res.send(200)).catch(err => {
            console.log(err);
            res.status(500).send(err);
          });
        }
      });
    }
  });
});

router.post('/leave_group', (req, res) => {
  // find the user from the database
  models.User.findOneAndUpdate({fb_id: req.query.fb_id}, {$pull: {'joined_groups': req.body.groupId}})
  .exec((err, user) => {
    // find the group and remove that member
    models.Group.findByIdAndUpdate(req.body.groupId, {$pull: {'members': {'fb_id': req.query.fb_id}}}, {new: true})
    .exec((err, group) => {
      
      // create and send notifications to all the members
      const message = {
        icon: '/images/' + user.fb_id + '.jpg',
        type: 'leave_group',
        title: 'Left group',
        body: user.name + " has left the group",
      };

      const subject = {
        fb_id: user.fb_id,
        name: user.name,
      };

      var promiseArray = group.members.map(item => {
        utils.createNotification(message, subject, group)
        .then(notification =>
          models.User.findOneAndUpdate({fb_id: item.fb_id},
          {$push: {'notifications': notification}})
          .exec())
        .then(user => utils.sendNotification(user.push_subscription, message));
      });

      promiseArray.push(
        utils.createNotification(message, subject, group)
        .then(notification =>
          models.User.findOneAndUpdate({fb_id: group.owner.fb_id},
          {$push: {'notifications': notification}})
          .exec())
        .then(user => utils.sendNotification(user.push_subscription, message))
      );

      Promise.all(promiseArray).then(values => res.send(200)).catch(err => {
        console.log(err);
        res.status(500).send(err);
      });

    });
  });
});

router.post('/toggle_status', (req, res) => {
    if (req.body.status == 'open')
      var newStatus = 'closed';
    else
      var newStatus = 'open';
  
    models.Group.findByIdAndUpdate(req.body.groupId, {status: newStatus})
    .exec((err, group) => {
      if (err)
        res.send(err);
      else {
        const message = {
          icon: '/images/' + group.owner.fb_id + '.jpg',
          type: 'toggle_status',
          title: 'Status changed',
          body: group.owner.name + " has " + (newStatus === 'open'? 'reopened' : 'closed') 
          + " the group",
        };
  
        const subject = {
          fb_id: group.owner.fb_id,
          name: group.owner.name,
        };

        var promiseArray = group.members.map(item => {
          utils.createNotification(message, subject, group)
          .then(notification =>
            models.User.findOneAndUpdate({fb_id: item.fb_id},
            {$push: {'notifications': notification}})
            .exec())
          .then(user => utils.sendNotification(user.push_subscription, message));
        });

        Promise.all(promiseArray).then(values => res.send(newStatus)).catch(err => {
          console.log(err);
          res.status(500).send(err);
        });
      }
    });
});


router.get('/change_time', (req, res) => {
    res.render('change_time.ejs');
});
  
router.post('/change_time', (req, res) => {
    
    models.Group.findByIdAndUpdate(req.body.groupId, {departure: new Date(req.body.departure)})
    .exec((err, group) => {
      if (err)
        res.send(err);
      else {
        const message = {
          icon: '/images/' + group.owner.fb_id + '.jpg',
          type: 'change_time',
          title: 'Time change',
          body: group.owner.name + ' has changed the departure time'
        };
  
        const subject = {
          fb_id: group.owner.fb_id,
          name: group.owner.name,
        }
  
        var promiseArray = group.members.map(item => {
          utils.createNotification(message, subject, group)
          .then(notification =>
            models.User.findOneAndUpdate({fb_id: item.fb_id},
            {$push: {'notifications': notification}})
            .exec())
          .then(user => utils.sendNotification(user.push_subscription, message));
        });
  
        Promise.all(promiseArray).then(values => res.send(200)).catch(err => {
          console.log(err);
          res.status(500).send(err);
        });
      }
    });
});

module.exports = router;
  